"""Tests for Pydantic request/response schemas."""

import pytest
from pydantic import ValidationError

from server.schemas import (
    GlossaryTermRequest,
    SingleTranslateRequest,
    BatchTranslateRequest,
    HybridTranslateRequest,
    TranslateResponse,
    BatchTranslateResponse,
    HybridTranslateResponse,
    HealthResponse,
    ModelInfoResponse,
)


class TestGlossaryTermRequest:
    def test_valid_exact_term(self):
        term = GlossaryTermRequest(
            input="dragon king",
            translation="Long Vương",
            matchType="Exact",
        )
        assert term.input == "dragon king"
        assert term.translation == "Long Vương"
        assert term.matchType == "Exact"
        assert term.variants is None

    def test_valid_case_insensitive_term(self):
        term = GlossaryTermRequest(
            input="sword",
            translation="kiếm",
            matchType="Case-Insensitive",
        )
        assert term.matchType == "Case-Insensitive"

    def test_valid_with_variants(self):
        term = GlossaryTermRequest(
            input="dragon king",
            translation="Long Vương",
            matchType="Exact",
            variants=["vua rồng", "long vương"],
        )
        assert term.variants == ["vua rồng", "long vương"]

    def test_invalid_match_type(self):
        with pytest.raises(ValidationError):
            GlossaryTermRequest(
                input="dragon king",
                translation="Long Vương",
                matchType="Regex",  # not allowed
            )

    def test_empty_input_rejected(self):
        with pytest.raises(ValidationError):
            GlossaryTermRequest(
                input="",
                translation="Long Vương",
                matchType="Exact",
            )

    def test_empty_translation_rejected(self):
        with pytest.raises(ValidationError):
            GlossaryTermRequest(
                input="dragon king",
                translation="",
                matchType="Exact",
            )

    def test_empty_variants_filtered(self):
        term = GlossaryTermRequest(
            input="test",
            translation="thử",
            matchType="Exact",
            variants=["", "  ", "variant1"],
        )
        # Empty/whitespace strings should be filtered
        assert term.variants == ["variant1"]


class TestSingleTranslateRequest:
    def test_valid_request_no_glossary(self):
        req = SingleTranslateRequest(text="Hello world")
        assert req.text == "Hello world"
        assert req.glossary is None

    def test_valid_request_with_glossary(self):
        req = SingleTranslateRequest(
            text="Hello world",
            glossary=[
                GlossaryTermRequest(
                    input="hello",
                    translation="xin chào",
                    matchType="Case-Insensitive",
                )
            ],
        )
        assert len(req.glossary) == 1
        assert req.glossary[0].input == "hello"

    def test_empty_text_rejected(self):
        with pytest.raises(ValidationError):
            SingleTranslateRequest(text="")

    def test_text_too_long_rejected(self):
        with pytest.raises(ValidationError):
            SingleTranslateRequest(text="x" * 5001)

    def test_text_exactly_5000_chars_accepted(self):
        text = "x" * 5000
        req = SingleTranslateRequest(text=text)
        assert len(req.text) == 5000

    def test_text_min_length_1_accepted(self):
        req = SingleTranslateRequest(text="a")
        assert req.text == "a"


class TestBatchTranslateRequest:
    def test_valid_batch(self):
        req = BatchTranslateRequest(texts=["Hello", "World", "Test"])
        assert len(req.texts) == 3

    def test_empty_batch_rejected(self):
        with pytest.raises(ValidationError):
            BatchTranslateRequest(texts=[])

    def test_batch_too_large_rejected(self):
        with pytest.raises(ValidationError):
            BatchTranslateRequest(texts=["text"] * 51)

    def test_batch_exactly_50_accepted(self):
        texts = ["text"] * 50
        req = BatchTranslateRequest(texts=texts)
        assert len(req.texts) == 50

    def test_batch_item_too_long_rejected(self):
        with pytest.raises(ValidationError):
            BatchTranslateRequest(texts=["ok", "x" * 5001])

    def test_batch_empty_item_rejected(self):
        with pytest.raises(ValidationError):
            BatchTranslateRequest(texts=["ok", ""])

    def test_single_item_batch_accepted(self):
        req = BatchTranslateRequest(texts=["single"])
        assert len(req.texts) == 1

    def test_batch_with_glossary(self):
        req = BatchTranslateRequest(
            texts=["Hello world"],
            glossary=[
                GlossaryTermRequest(
                    input="hello",
                    translation="xin chào",
                    matchType="Case-Insensitive",
                )
            ],
        )
        assert len(req.glossary) == 1


class TestHybridTranslateRequest:
    def test_valid_request(self):
        req = HybridTranslateRequest(text="Hello world")
        assert req.text == "Hello world"
        assert req.llm_provider is None

    def test_with_llm_provider(self):
        req = HybridTranslateRequest(text="Hello", llm_provider="gemini")
        assert req.llm_provider == "gemini"

    def test_empty_text_rejected(self):
        with pytest.raises(ValidationError):
            HybridTranslateRequest(text="")


class TestTranslateResponse:
    def test_valid_response(self):
        resp = TranslateResponse(
            translation="Xin chào thế giới",
            warnings=["glossary: could not replace 'world'"],
            time_ms=150,
        )
        assert resp.translation == "Xin chào thế giới"
        assert len(resp.warnings) == 1
        assert resp.time_ms == 150

    def test_no_warnings(self):
        resp = TranslateResponse(translation="Xin chào", time_ms=100)
        assert resp.warnings == []
        assert resp.translation == "Xin chào"


class TestBatchTranslateResponse:
    def test_valid_response(self):
        resp = BatchTranslateResponse(
            translations=["A", "B", "C"],
            warnings=["batch processed"],
            time_ms=300,
        )
        assert len(resp.translations) == 3


class TestHybridTranslateResponse:
    def test_valid_response(self):
        resp = HybridTranslateResponse(
            translation="Xin chào (refined)",
            draft="Xin chào (raw)",
            warnings=["polish took 5s"],
            time_ms=5200,
        )
        assert resp.translation == "Xin chào (refined)"
        assert resp.draft == "Xin chào (raw)"


class TestHealthResponse:
    def test_ok_response(self):
        resp = HealthResponse(status="ok", model_loaded=True)
        assert resp.status == "ok"
        assert resp.model_loaded is True

    def test_model_not_loaded(self):
        resp = HealthResponse(status="ok", model_loaded=False)
        assert resp.status == "ok"
        assert resp.model_loaded is False


class TestModelInfoResponse:
    def test_valid_response(self):
        resp = ModelInfoResponse(name="opus-mt-en-vi-murim", quantization="int8")
        assert resp.name == "opus-mt-en-vi-murim"
        assert resp.quantization == "int8"
