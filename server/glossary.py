"""Best-effort glossary post-processing.

Implements longest-match-first known-variant replacement on the VI output
side after the model has produced a translation.  This is deliberately NOT a
guaranteed force-replace — if the model used an unknown VI phrase the output
is left alone and a warning is emitted.

Strategy (from plan phase-04):
1. Sort glossary terms by EN input length descending (longest-match-first).
2. Detect EN term using per-term matchType (Exact / Case-Insensitive) with
   Unicode word-boundary regex.
3. If detected, replace known VI variants when they appear in the output.
4. If no variant matches, leave output unchanged + return a warning.
5. Use ``re.escape()`` on ALL glossary/variant strings.
"""

import re
from dataclasses import dataclass, field

from .schemas import GlossaryTermRequest


@dataclass
class GlossaryResult:
    vi_output: str
    warnings: list[str] = field(default_factory=list)


def _build_en_pattern(term: str, match_type: str) -> re.Pattern[str]:
    """Build a compiled regex to detect an EN term in English input text.

    Uses Unicode word boundaries and respects the term's matchType.
    """
    escaped = re.escape(term)
    flags = re.UNICODE
    if match_type == "Case-Insensitive":
        flags |= re.IGNORECASE
    return re.compile(rf"(?<!\w){escaped}(?!\w)", flags)


def apply_glossary(
    vi_output: str,
    en_input: str,
    glossary_terms: list[GlossaryTermRequest],
) -> GlossaryResult:
    """Apply best-effort glossary post-processing to a VI translation.

    Args:
        vi_output: Raw output from the MT model.
        en_input: Original English source text.
        glossary_terms: Glossary terms from the client request.

    Returns:
        ``GlossaryResult`` with the (possibly modified) VI output and any
        warnings about terms that could not be replaced.
    """
    warnings: list[str] = []
    result = vi_output

    if not glossary_terms or not en_input:
        return GlossaryResult(vi_output=result, warnings=warnings)

    # Sort by EN input length descending (longest-match-first).
    sorted_terms = sorted(
        glossary_terms,
        key=lambda t: len(t.input),
        reverse=True,
    )

    protected: list[tuple[int, int]] = []  # (start, end) regions already replaced

    for term in sorted_terms:
        # 1. Detect EN term in source text.
        en_pattern = _build_en_pattern(term.input, term.matchType)
        if not en_pattern.search(en_input):
            continue  # Term not in EN source — skip

        variants = term.variants or []

        # 2. Try to replace known VI variants in the output.
        replaced = False
        for variant in variants:
            escaped_variant = re.escape(variant)
            flags = re.UNICODE
            # Variant matching is case-insensitive to catch model casing
            # variations.
            flags |= re.IGNORECASE
            vi_pattern = re.compile(rf"(?<!\w){escaped_variant}(?!\w)", flags)

            match = vi_pattern.search(result)
            while match:
                start, end = match.start(), match.end()
                # Skip if this region overlaps an already-protected region.
                if any(p_start < end and start < p_end for p_start, p_end in protected):
                    match = vi_pattern.search(result, match.end())
                    continue

                result = result[:start] + term.translation + result[end:]
                offset = len(term.translation) - (end - start)
                protected.append((start, start + len(term.translation)))
                replaced = True

                # Update protected positions after this insertion.
                protected = [
                    (ps + offset if ps > start else ps, pe + offset if pe > start else pe)
                    for ps, pe in protected[:-1]
                ] + [protected[-1]]

                match = vi_pattern.search(result, start + len(term.translation))

        # 3. If EN term was detected but no variant found in output, warn.
        if not replaced:
            warnings.append(
                f"glossary: term '{term.input}' matched in source but no variant "
                f"found in translation output"
            )

    return GlossaryResult(vi_output=result, warnings=warnings)
