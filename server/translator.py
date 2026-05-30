"""Translator interface and implementations.

The Translator protocol allows swapping between MockTranslator (for
development/testing) and CT2Translator (for production with a fine-tuned
CTranslate2 model) without changing any endpoint code.
"""

from typing import Protocol


class Translator(Protocol):
    """Interface for text translation engines."""

    def translate(self, text: str) -> str:
        """Translate a single text string."""
        ...

    def translate_batch(self, texts: list[str]) -> list[str]:
        """Translate a batch of text strings."""
        ...


class MockTranslator:
    """Deterministic mock translator for development and testing.

    Returns ``[VI] {input_text}`` for every input so callers can verify the
    translation pipeline end-to-end without a real model.
    """

    def translate(self, text: str) -> str:
        return f"[VI] {text}"

    def translate_batch(self, texts: list[str]) -> list[str]:
        return [self.translate(t) for t in texts]


# When Phase 3 (CTranslate2 export) completes, implement:
#
# class CT2Translator:
#     def __init__(self, model_path: str, device: str = "cpu", ...): ...
#     def translate(self, text: str) -> str: ...
#     def translate_batch(self, texts: list[str]) -> list[str]: ...
