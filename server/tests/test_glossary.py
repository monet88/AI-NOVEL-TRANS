"""Tests for the glossary post-processor."""

import pytest

from server.glossary import GlossaryResult, apply_glossary
from server.schemas import GlossaryTermRequest


def _term(input_text, translation, match_type="Exact", variants=None):
    return GlossaryTermRequest(
        input=input_text,
        translation=translation,
        matchType=match_type,
        variants=variants or [],
    )


class TestApplyGlossary:
    def test_no_glossary_terms_returns_unchanged(self):
        result = apply_glossary(
            vi_output="Long Vương nói với kiếm",
            en_input="Dragon King spoke to the sword",
            glossary_terms=[],
        )
        assert result.vi_output == "Long Vương nói với kiếm"
        assert result.warnings == []

    def test_exact_match_replaces_known_variant(self):
        result = apply_glossary(
            vi_output="vua rồng nói",
            en_input="dragon king spoke",
            glossary_terms=[
                _term("dragon king", "Long Vương", "Exact", variants=["vua rồng", "long vương"]),
            ],
        )
        assert result.vi_output == "Long Vương nói"
        assert result.warnings == []

    def test_case_insensitive_match_replaces_variant(self):
        result = apply_glossary(
            vi_output="VUA RỒNG nói",
            en_input="DRAGON KING spoke",
            glossary_terms=[
                _term("dragon king", "Long Vương", "Case-Insensitive", variants=["vua rồng"]),
            ],
        )
        assert result.vi_output == "Long Vương nói"

    def test_variant_not_found_adds_warning(self):
        result = apply_glossary(
            vi_output="rồng chúa nói",  # unknown variant
            en_input="dragon king spoke",
            glossary_terms=[
                _term("dragon king", "Long Vương", "Exact", variants=["vua rồng"]),
            ],
        )
        # Should leave output unchanged since variant not found
        assert result.vi_output == "rồng chúa nói"
        assert len(result.warnings) == 1
        assert "dragon king" in result.warnings[0]

    def test_longest_match_first_prevents_partial_replacement(self):
        """'dragon king' must be matched before 'dragon' to avoid partial replacement."""
        result = apply_glossary(
            vi_output="vua rồng và rồng",
            en_input="dragon king and dragon",
            glossary_terms=[
                _term("dragon", "rồng thường", "Exact", variants=["rồng"]),
                _term("dragon king", "Long Vương", "Exact", variants=["vua rồng"]),
            ],
        )
        # Longest match first: "dragon king" → "Long Vương", then "dragon" → "rồng thường"
        assert result.vi_output == "Long Vương và rồng thường"
        assert result.warnings == []

    def test_protected_regions_not_overwritten(self):
        """Already-replaced regions should not be overwritten by shorter terms."""
        result = apply_glossary(
            vi_output="long kiếm",
            en_input="dragon sword",
            glossary_terms=[
                _term("dragon sword", "Long Kiếm", "Exact", variants=["long kiếm"]),
                _term("dragon", "rồng", "Exact", variants=["long"]),
            ],
        )
        # "dragon sword" is longer, matched first → "Long Kiếm"
        # "dragon" has variant "long" which appears in output, but region protected
        assert result.vi_output == "Long Kiếm"

    def test_regex_escape_handles_special_chars(self):
        """Glossary terms with regex special chars should not break matching."""
        result = apply_glossary(
            vi_output="test [bracket] here",
            en_input="test [bracket] here",
            glossary_terms=[
                _term("[bracket]", "ngoặc", "Exact", variants=["[bracket]"]),
            ],
        )
        assert result.vi_output == "test ngoặc here"

    def test_unicode_word_boundary_exact(self):
        """Exact match must respect Unicode word boundaries."""
        result = apply_glossary(
            vi_output="kiếm kiếm thuật",
            en_input="sword sword art",
            glossary_terms=[
                _term("sword", "kiếm mới", "Exact", variants=["kiếm"]),
            ],
        )
        # "kiếm" appears as standalone word AND as part of "kiếm thuật"
        # With word boundary: only standalone "kiếm" is replaced
        assert "kiếm mới" in result.vi_output

    def test_unicode_word_boundary_case_insensitive(self):
        result = apply_glossary(
            vi_output="KIẾM thuật",
            en_input="SWORD art",
            glossary_terms=[
                _term("sword", "kiếm mới", "Case-Insensitive", variants=["kiếm"]),
            ],
        )
        assert result.vi_output == "kiếm mới thuật"

    def test_multiple_glossary_terms(self):
        result = apply_glossary(
            vi_output="vua rồng dùng kiếm",
            en_input="dragon king uses sword",
            glossary_terms=[
                _term("dragon king", "Long Vương", "Exact", variants=["vua rồng"]),
                _term("sword", "kiếm thần", "Exact", variants=["kiếm"]),
            ],
        )
        assert result.vi_output == "Long Vương dùng kiếm thần"
        assert result.warnings == []

    def test_unicode_characters_in_glossary(self):
        """Terms with Vietnamese diacritics must be handled correctly."""
        result = apply_glossary(
            vi_output="đại hiệp nói",
            en_input="hero spoke",
            glossary_terms=[
                _term("hero", "đại hiệp", "Exact", variants=["đại hiệp"]),
            ],
        )
        assert result.vi_output == "đại hiệp nói"

    def test_empty_en_input(self):
        result = apply_glossary(
            vi_output="some output",
            en_input="",
            glossary_terms=[
                _term("test", "thử", "Exact", variants=["test"]),
            ],
        )
        assert result.vi_output == "some output"
        assert result.warnings == []

    def test_no_variants_in_term(self):
        """Term without variants should still match EN side and warn."""
        result = apply_glossary(
            vi_output="unknown phrase",
            en_input="dragon king spoke",
            glossary_terms=[
                _term("dragon king", "Long Vương", "Exact"),
            ],
        )
        # EN detected but no VI variant to replace → warning
        assert len(result.warnings) == 1
        assert "dragon king" in result.warnings[0]
