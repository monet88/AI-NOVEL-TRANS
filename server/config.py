"""Server configuration loaded from environment variables."""

import os


def _env_list(key: str, default: str) -> list[str]:
    """Parse a comma-separated env var into a list of trimmed strings."""
    raw = os.getenv(key, default)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


# CORS origins allowed to access the API.
ALLOWED_ORIGINS: list[str] = _env_list(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:4173",
)

# Path to CTranslate2 model directory (used by CT2Translator when available).
MODEL_PATH: str = os.getenv("MODEL_PATH", "./ct2-model")

# Number of CPU threads for CTranslate2 inference.
CT2_THREADS: int = int(os.getenv("CT2_THREADS", "4"))

# Server port.
PORT: int = int(os.getenv("PORT", "8000"))

# Maximum concurrent translation requests.
MAX_CONCURRENT_TRANSLATIONS: int = int(os.getenv("MAX_CONCURRENT_TRANSLATIONS", "4"))

# Maximum concurrent hybrid (LLM polish) requests.
MAX_CONCURRENT_HYBRID: int = int(os.getenv("MAX_CONCURRENT_HYBRID", "2"))

# Timeout in seconds for LLM polish calls.
HYBRID_TIMEOUT_SECONDS: int = int(os.getenv("HYBRID_TIMEOUT_SECONDS", "30"))
