"""FastAPI application for the Local MT server.

Wraps a pluggable Translator (MockTranslator by default) behind REST
endpoints that match the React client contracts in services/api/local-mt.ts.
"""

import asyncio
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import (
    ALLOWED_ORIGINS,
    HYBRID_TIMEOUT_SECONDS,
    MAX_CONCURRENT_HYBRID,
    MAX_CONCURRENT_TRANSLATIONS,
)
from .glossary import apply_glossary
from .schemas import (
    BatchTranslateRequest,
    BatchTranslateResponse,
    HealthResponse,
    HybridTranslateRequest,
    HybridTranslateResponse,
    ModelInfoResponse,
    SingleTranslateRequest,
    TranslateResponse,
)
from .translator import MockTranslator, Translator


# ---------------------------------------------------------------------------
# Semaphores for concurrency control (shared across all requests)
# ---------------------------------------------------------------------------

_translate_semaphore = asyncio.Semaphore(MAX_CONCURRENT_TRANSLATIONS)
_hybrid_semaphore = asyncio.Semaphore(MAX_CONCURRENT_HYBRID)


# ---------------------------------------------------------------------------
# CORS safety guard
# ---------------------------------------------------------------------------


def _validate_cors_origins(origins: list[str]) -> None:
    """Raise if any origin is a wildcard while credentials are enabled.

    Browsers block credentialed requests with ``Access-Control-Allow-Origin: *``,
    so this is always a misconfiguration.
    """
    for origin in origins:
        stripped = origin.strip()
        if stripped == "*":
            raise RuntimeError(
                "ALLOWED_ORIGINS cannot contain '*' when allow_credentials=True. "
                "Use explicit origins instead."
            )


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    The translator is stored on ``app.state.translator`` so tests can
    override it via dependency_overrides without touching module-level state.
    """

    _validate_cors_origins(ALLOWED_ORIGINS)

    @asynccontextmanager
    async def _lifespan(app: FastAPI):  # noqa: ARG001
        """Startup/shutdown — load model when CT2Translator is available."""
        # Set default translator; tests override via dependency_overrides.
        if not hasattr(app.state, "translator"):
            app.state.translator = MockTranslator()
        yield

    app = FastAPI(
        title="Local MT Server",
        description="Offline EN→VI machine translation API for murim/xianxia novels",
        version="0.1.0",
        lifespan=_lifespan,
    )

    # CORS — only allow configured origins, default to local dev.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    return app


app = create_app()


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

# Default translator used when app.state.translator is not set (e.g. during
# module import or in TestClient before the lifespan runs).
_default_translator: Translator = MockTranslator()


def get_translator() -> Translator:
    """Return the current translator.

    Prefers ``app.state.translator`` (set during lifespan) so tests can
    override via ``app.dependency_overrides``; falls back to the module-level
    default.
    """
    if hasattr(app.state, "translator"):
        return app.state.translator  # type: ignore[no-any-return]
    return _default_translator


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _elapsed(start: float) -> int:
    """Return elapsed time in milliseconds since *start*."""
    return int((time.monotonic() - start) * 1000)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/health", response_model=HealthResponse)
async def health():
    """Server health check — called by the React client before translation."""
    return HealthResponse(
        status="ok",
        model_loaded=True,  # Mock is always "loaded"; CT2Translator would check real state
    )


@app.get("/api/model/info", response_model=ModelInfoResponse)
async def model_info():
    """Return model metadata."""
    return ModelInfoResponse(
        name="opus-mt-en-vi-murim (mock)",
        quantization="int8 (mock)",
    )


@app.post("/api/translate", response_model=TranslateResponse)
async def translate(
    request: SingleTranslateRequest,
    translator: Translator = Depends(get_translator),
):
    """Translate a single text with optional glossary post-processing."""
    start = time.monotonic()

    async with _translate_semaphore:
        raw = translator.translate(request.text)

    result = apply_glossary(
        vi_output=raw,
        en_input=request.text,
        glossary_terms=request.glossary or [],
    )

    return TranslateResponse(
        translation=result.vi_output,
        warnings=result.warnings,
        time_ms=_elapsed(start),
    )


@app.post("/api/translate/batch", response_model=BatchTranslateResponse)
async def translate_batch(
    request: BatchTranslateRequest,
    translator: Translator = Depends(get_translator),
):
    """Translate a batch of texts."""
    start = time.monotonic()

    async with _translate_semaphore:
        raw_translations = translator.translate_batch(request.texts)

    all_warnings: list[str] = []
    polished: list[str] = []

    for source, raw in zip(request.texts, raw_translations):
        result = apply_glossary(
            vi_output=raw,
            en_input=source,
            glossary_terms=request.glossary or [],
        )
        polished.append(result.vi_output)
        all_warnings.extend(result.warnings)

    return BatchTranslateResponse(
        translations=polished,
        warnings=all_warnings,
        time_ms=_elapsed(start),
    )


@app.post("/api/translate/hybrid", response_model=HybridTranslateResponse)
async def translate_hybrid(
    request: HybridTranslateRequest,
    translator: Translator = Depends(get_translator),
):
    """MT draft + optional server-side LLM polish.

    **Security**: Authorization headers are read for forwarding to the LLM
    but are NEVER logged or stored.  On timeout or failure the raw MT draft
    is returned with a warning.
    """
    start = time.monotonic()
    warnings: list[str] = []

    # 1. Get MT draft
    async with _translate_semaphore:
        draft = translator.translate(request.text)

    # 2. Apply glossary to draft
    glossary_result = apply_glossary(
        vi_output=draft,
        en_input=request.text,
        glossary_terms=request.glossary or [],
    )
    draft = glossary_result.vi_output
    warnings.extend(glossary_result.warnings)

    # 3. Server-side LLM polish (placeholder — real implementation needs
    #    LLM API client integration and the Authorization header from the
    #    raw Request object).
    #    For now, return the draft as-is with a warning.
    async with _hybrid_semaphore:
        llm_polished = None
        try:
            async with asyncio.timeout(HYBRID_TIMEOUT_SECONDS):
                # --- placeholder: call LLM API here ---
                # raw_request: Request = ...  (injected via Depends)
                # auth_header = raw_request.headers.get("Authorization", "")
                # polished = await _call_llm_polish(draft, request.text, auth_header)
                pass
        except asyncio.TimeoutError:
            warnings.append("LLM polish timed out — returning raw MT draft")
        except Exception:
            warnings.append("LLM polish failed — returning raw MT draft")

    if llm_polished:
        translation = llm_polished
    else:
        translation = draft
        if not any("LLM polish" in w for w in warnings):
            warnings.append("LLM polish not available — returning raw MT draft")

    return HybridTranslateResponse(
        translation=translation,
        draft=draft,
        warnings=warnings,
        time_ms=_elapsed(start),
    )
