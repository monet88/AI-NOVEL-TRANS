"""Tests for the Translator interface and MockTranslator."""

from server.translator import MockTranslator


class TestMockTranslator:
    def test_translate_returns_prefixed_text(self):
        translator = MockTranslator()
        result = translator.translate("Hello world")
        assert result == "[VI] Hello world"

    def test_translate_empty_string(self):
        translator = MockTranslator()
        result = translator.translate("")
        assert result == "[VI] "

    def test_translate_vietnamese_input(self):
        translator = MockTranslator()
        result = translator.translate("xin chào")
        assert result == "[VI] xin chào"

    def test_translate_batch_multiple_texts(self):
        translator = MockTranslator()
        results = translator.translate_batch(["Hello", "World", "Test"])
        assert results == ["[VI] Hello", "[VI] World", "[VI] Test"]

    def test_translate_batch_empty_list(self):
        translator = MockTranslator()
        results = translator.translate_batch([])
        assert results == []

    def test_translate_batch_single_item(self):
        translator = MockTranslator()
        results = translator.translate_batch(["single"])
        assert results == ["[VI] single"]

    def test_mock_is_deterministic(self):
        translator = MockTranslator()
        r1 = translator.translate("test")
        r2 = translator.translate("test")
        assert r1 == r2
        assert r1 == "[VI] test"

    def test_translate_preserves_punctuation(self):
        translator = MockTranslator()
        result = translator.translate("Hello, world!")
        assert result == "[VI] Hello, world!"
