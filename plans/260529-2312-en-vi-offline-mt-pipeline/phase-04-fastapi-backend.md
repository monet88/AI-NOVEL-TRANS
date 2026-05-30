---
phase: 4
title: "FastAPI Backend"
status: done
priority: P1
effort: "4-6h"
dependencies: [3]
---

# Phase 4: FastAPI Backend

## Overview

Build FastAPI server wrapping CTranslate2 runtime. Includes best-effort glossary post-processing and local web app integration. Runs locally alongside React web app.

Execution mode for this phase: Claude edits code and runs local server validation commands directly.

## Requirements

- Functional: `/api/translate` endpoint with optional glossary terms
- Functional: Best-effort glossary post-processing using user-refined glossary variants
- Functional: Batch endpoint for multiple paragraphs
- Functional: Hybrid endpoint for server-side LLM polish with strict timeout/fallback behavior
- Non-functional: Response ≤ 2s for single paragraph (≤500 chars)
- Non-functional: Max batch size 50, max text length 5000 chars per item
- Non-functional: Request validation enforced by Pydantic schemas
- Security: Never log forwarded LLM API keys or Authorization headers

## Architecture

```
React App (localhost:5173)
  │
  ├─ POST /api/translate       → single text + glossary
  ├─ POST /api/translate/batch → batch paragraphs
  ├─ POST /api/translate/hybrid → MT draft + server-side LLM polish
  ├─ GET  /api/health          → server + model status
  └─ GET  /api/model/info      → model metadata
  │
  ▼
FastAPI Server (localhost:8000)
  │
  ├─ CT2Translator: CTranslate2 runtime (INT8 Marian model)
  ├─ Tokenizer: HuggingFace MarianTokenizer or exact exported preprocessing
  ├─ GlossaryPostProcessor: best-effort known-variant replacement
  ├─ RequestLimiter: semaphore/rate guard for CPU + hybrid LLM calls
  └─ Response with translated text + warnings
```

## Glossary Post-Processing Logic

```python
def apply_glossary(vi_output: str, en_input: str, glossary: list[GlossaryTerm]) -> GlossaryResult:
    """
    Best-effort known-variant strategy:
    1. Sort glossary terms by EN input length descending (longest-match-first).
    2. Detect EN term using per-term matchType:
       - Exact: case-sensitive Unicode word-boundary match
       - Case-Insensitive: case-insensitive Unicode word-boundary match
    3. If detected, replace known VI variants / known-bad translations when present.
    4. If no known VI variant appears in model output, leave output unchanged and return a warning.

    Reality: post-processing cannot reliably locate an arbitrary model translation
    without alignment. Users refine glossary over chapters; hybrid LLM polish handles
    nuance when deterministic replacement cannot.
    """
```

### Glossary Request Shape

Client sends only fields needed by server:

```json
{
  "input": "dragon king",
  "translation": "Long Vương",
  "matchType": "Case-Insensitive",
  "variants": ["vua rồng", "long vương"]
}
```

- `id` and `gender` stay client-side; do not send unless needed later.
- `variants` is optional V1 extension for known bad/alternate VI outputs.
- Use `re.escape()` for every glossary string.
- Use Unicode regex mode; never use `re.ASCII`.

## Related Code Files

- Create: `server/main.py` — FastAPI app entry point
- Create: `server/translator.py` — CTranslate2 wrapper class
- Create: `server/glossary.py` — Best-effort glossary logic
- Create: `server/schemas.py` — Pydantic request/response models with validators
- Create: `server/config.py` — Server configuration
- Create: `server/requirements.txt` — fastapi, uvicorn, ctranslate2, transformers, sentencepiece, pydantic

## Implementation Steps

1. **Project setup**
   - Create `server/` directory at project root
   - `requirements.txt`: fastapi, uvicorn[standard], ctranslate2, transformers, sentencepiece, pydantic
   - Config: model path, CT2 threads (default: 4), port 8000, `ALLOWED_ORIGINS`

2. **Pydantic schemas** (`schemas.py`)
   - Enforce limits at boundary:
     ```python
     text: str = Field(min_length=1, max_length=5000)
     texts: list[str] = Field(min_length=1, max_length=50)
     ```
   - Validate each batch item max length 5000
   - Glossary term schema: `input`, `translation`, `matchType`, optional `variants`

3. **CT2 translator wrapper** (`translator.py`)
   - Load model on startup (singleton)
   - Use HuggingFace `MarianTokenizer` or exact preprocessing exported with model; do not assume raw SentencePiece alone is sufficient
   - `translate(text: str) -> str`: tokenize → translate → detokenize
   - `translate_batch(texts: list[str]) -> list[str]`: batch inference with max concurrency guard

4. **Glossary post-processor** (`glossary.py`)
   - `apply_glossary(vi_output, en_input, glossary_terms) -> GlossaryResult`
   - Sort glossary terms by EN length descending (longest-match-first)
   - EN-side detection: Unicode word-boundary match with `matchType` respected
   - VI-side replacement: replace `variants` found in output with `translation`; protect replaced regions from shorter-term collisions
   - If no variant appears, leave output unchanged and include warning metadata
   - Use `re.escape()` on all glossary/variant terms to prevent regex injection

5. **API endpoints** (`main.py`)
   ```
   POST /api/translate
   Body: { "text": str, "glossary": [{"input": str, "translation": str, "matchType": str, "variants": [str]?}]? }
   Response: { "translation": str, "warnings": [str], "time_ms": int }

   POST /api/translate/batch
   Body: { "texts": [str], "glossary": [...]? }
   Response: { "translations": [str], "warnings": [str], "time_ms": int }

   POST /api/translate/hybrid
   Body: { "text": str, "glossary": [...]?, "llm_provider": str? }
   Headers: Authorization: Bearer <llm_api_key> (optional; falls back to server config)
   Response: { "translation": str, "draft": str, "warnings": [str], "time_ms": int }

   GET /api/health → { "status": "ok", "model_loaded": bool }
   GET /api/model/info → { "name": str, "quantization": str }
   ```

6. **Hybrid endpoint safety**
   - Prefer client-side hybrid in UI; server-side hybrid is for headless/batch use
   - Never log `Authorization` header or forwarded API key
   - Disable debug logging of request headers/bodies containing secrets
   - Add LLM polish timeout (e.g., 30s). On timeout/error: return raw MT draft + warning instead of hanging
   - Limit hybrid concurrency with semaphore/rate guard to prevent accidental cost spike

7. **CORS and local deployment**
   - Configure CORS from `ALLOWED_ORIGINS` env var
   - Default: `http://localhost:5173,http://localhost:4173`
   - Do not use wildcard origins by default
   - Gradio demo loads model in-process; it does not call this local FastAPI server

## Success Criteria

- [ ] Server starts and loads CT2 model in < 5s
- [ ] Pydantic rejects empty text, text >5000 chars, batch >50, oversized batch items
- [ ] `/api/translate` returns translation + warnings metadata
- [ ] Glossary post-processing replaces known variants and warns on no-variant match
- [ ] `/api/translate/batch` handles 10+ paragraphs within defined limits
- [ ] `/api/translate/hybrid` times out safely and falls back to raw MT draft
- [ ] CORS uses `ALLOWED_ORIGINS` and defaults to local dev origins only
- [ ] Authorization headers/API keys are never logged
- [ ] Response ≤ 2s for single paragraph

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Glossary cannot locate model's unknown VI phrase | Explicitly best-effort; support known variants; hybrid LLM polish handles nuance |
| Glossary replacement corrupts overlapping terms | Longest-match-first + protected replaced regions |
| Regex injection in glossary | `re.escape()` all glossary inputs and variants |
| User API key leaks via server-side hybrid | Never log Authorization; prefer client-side hybrid; use env fallback carefully |
| Huge request causes DoS | Pydantic limits + max batch size + per-item max length |
| Hybrid endpoint causes LLM cost spike | Timeout + semaphore/rate guard |
| CORS opened too broadly | Env-configured allowlist; localhost defaults; no wildcard default |
| Memory usage | INT8 model ~80MB, acceptable with bounded batch/input sizes |
