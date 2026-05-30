"""Pydantic request/response models for the Local MT API.

Contracts match the React client in services/api/local-mt.ts.
"""

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class GlossaryTermRequest(BaseModel):
    """A single glossary term sent by the client.

    Only the fields the server needs: input, translation, matchType, and
    optional variants.  id and gender stay client-side.
    """

    input: str = Field(min_length=1, max_length=500, description="Source EN term")
    translation: str = Field(min_length=1, max_length=500, description="Target VI term")
    matchType: str = Field(
        default="Case-Insensitive",
        description="Match strategy: 'Exact' or 'Case-Insensitive'",
    )
    variants: list[str] | None = Field(
        default=None,
        description="Optional known VI output variants (for best-effort replacement)",
    )

    @field_validator("matchType")
    @classmethod
    def _validate_match_type(cls, v: str) -> str:
        if v not in ("Exact", "Case-Insensitive"):
            raise ValueError(f"matchType must be 'Exact' or 'Case-Insensitive', got '{v}'")
        return v

    @field_validator("variants")
    @classmethod
    def _filter_empty_variants(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        filtered = [item.strip() for item in v if item and item.strip()]
        return filtered if filtered else None


class SingleTranslateRequest(BaseModel):
    """POST /api/translate"""

    text: str = Field(min_length=1, max_length=5000)
    glossary: list[GlossaryTermRequest] | None = None


class BatchTranslateRequest(BaseModel):
    """POST /api/translate/batch"""

    texts: list[str] = Field(min_length=1, max_length=50)
    glossary: list[GlossaryTermRequest] | None = None

    @field_validator("texts")
    @classmethod
    def _validate_batch_items(cls, v: list[str]) -> list[str]:
        for i, item in enumerate(v):
            if not item or not item.strip():
                raise ValueError(f"Batch item at index {i} must not be empty")
            if len(item) > 5000:
                raise ValueError(
                    f"Batch item at index {i} exceeds 5000 characters ({len(item)})"
                )
        return v


class HybridTranslateRequest(BaseModel):
    """POST /api/translate/hybrid"""

    text: str = Field(min_length=1, max_length=5000)
    glossary: list[GlossaryTermRequest] | None = None
    llm_provider: str | None = Field(
        default=None,
        description="Optional LLM provider hint (gemini|openai|deepseek)",
    )


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class TranslateResponse(BaseModel):
    translation: str
    warnings: list[str] = Field(default_factory=list)
    time_ms: int = 0


class BatchTranslateResponse(BaseModel):
    translations: list[str]
    warnings: list[str] = Field(default_factory=list)
    time_ms: int = 0


class HybridTranslateResponse(BaseModel):
    translation: str
    draft: str
    warnings: list[str] = Field(default_factory=list)
    time_ms: int = 0


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


class ModelInfoResponse(BaseModel):
    name: str
    quantization: str
