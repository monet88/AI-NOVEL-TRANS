"""Validate pivot output and produce train/val parallel text files.

Pipeline (plan phase-01 steps 3-5):

1. Validate each pivoted row:
   * EN output must be >= 80% Latin script (reject non-Latin / wrong-language).
   * length ratio len(EN)/len(ZH) must be within [0.3, 4.0].
   * EN output must contain <= 20% CJK characters (failed translation).
   * reject refusal patterns ("I cannot", "I'm sorry", "As an AI", ...).
   Rejected rows are logged to ``pivot_rejected.jsonl`` with a reason.

2. Split the surviving pairs 95% train / 5% val (deterministic seed).

3. Write ``train.en``, ``train.vi``, ``val.en``, ``val.vi`` — one paragraph per
   line, newlines within a paragraph collapsed to spaces so line counts align.

Language/script checks use pure-Python Unicode heuristics (no fasttext
dependency) which is sufficient to separate English from Chinese here.

Usage:
    python -m ml.data.split_train_val \
        --input ml/data/pivot/pivot_output.jsonl \
        --out-dir ml/data/final
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

MIN_LATIN_RATIO = 0.80
MAX_CJK_RATIO = 0.20
MIN_LEN_RATIO = 0.30
MAX_LEN_RATIO = 4.0
DEFAULT_VAL_FRACTION = 0.05
DEFAULT_SEED = 42

REFUSAL_PATTERNS = (
    "i cannot",
    "i can't",
    "i'm sorry",
    "i am sorry",
    "as an ai",
    "i am unable",
    "i'm unable",
    "cannot translate",
)


@dataclass(frozen=True)
class Pair:
    """A validated EN<->VI parallel pair."""

    en: str
    vi: str


def _is_cjk(ch: str) -> bool:
    """Return True if *ch* is a CJK ideograph or CJK punctuation."""
    code = ord(ch)
    return (
        0x4E00 <= code <= 0x9FFF  # CJK Unified Ideographs
        or 0x3400 <= code <= 0x4DBF  # CJK Extension A
        or 0x3000 <= code <= 0x303F  # CJK Symbols and Punctuation
        or 0xFF00 <= code <= 0xFFEF  # Halfwidth/Fullwidth Forms
    )


def _is_latin(ch: str) -> bool:
    """Return True if *ch* is a Latin-script letter."""
    if not ch.isalpha():
        return False
    try:
        return "LATIN" in unicodedata.name(ch)
    except ValueError:
        return False


def latin_ratio(text: str) -> float:
    """Fraction of alphabetic characters that are Latin-script.

    Returns 0.0 when the text has no alphabetic characters.
    """
    letters = [ch for ch in text if ch.isalpha()]
    if not letters:
        return 0.0
    latin = sum(1 for ch in letters if _is_latin(ch))
    return latin / len(letters)


def cjk_ratio(text: str) -> float:
    """Fraction of non-space characters that are CJK.

    Returns 0.0 for empty / whitespace-only text.
    """
    chars = [ch for ch in text if not ch.isspace()]
    if not chars:
        return 0.0
    cjk = sum(1 for ch in chars if _is_cjk(ch))
    return cjk / len(chars)


def contains_refusal(text: str) -> bool:
    """Return True if the EN text looks like an LLM refusal."""
    lowered = text.lower()
    return any(pattern in lowered for pattern in REFUSAL_PATTERNS)


def validate_pivot_row(source_zh: str, pivot_en: str) -> str | None:
    """Validate one pivoted row.

    Args:
        source_zh: Original Chinese source.
        pivot_en: Gemini-produced English translation.

    Returns:
        ``None`` if the row passes, otherwise a short rejection reason.
    """
    en = (pivot_en or "").strip()
    zh = (source_zh or "").strip()

    if not en:
        return "empty_en"
    if not zh:
        return "empty_zh"
    if contains_refusal(en):
        return "refusal"
    if latin_ratio(en) < MIN_LATIN_RATIO:
        return "low_latin_ratio"
    if cjk_ratio(en) > MAX_CJK_RATIO:
        return "high_cjk_ratio"

    ratio = len(en) / len(zh)
    if ratio < MIN_LEN_RATIO:
        return "length_ratio_low"
    if ratio > MAX_LEN_RATIO:
        return "length_ratio_high"

    return None


def _normalize_line(text: str) -> str:
    """Collapse internal whitespace/newlines so one pair == one output line."""
    return " ".join(text.split())


def validate_and_collect(
    input_path: Path,
    rejected_path: Path,
) -> list[Pair]:
    """Validate every row in the pivot output, writing rejects to a log.

    Args:
        input_path: ``pivot_output.jsonl`` from the pivot step.
        rejected_path: Destination JSONL for rejected rows + reasons.

    Returns:
        List of surviving ``Pair`` objects (with normalized single-line text).
    """
    pairs: list[Pair] = []
    rejected_path.parent.mkdir(parents=True, exist_ok=True)

    with input_path.open("r", encoding="utf-8") as src, rejected_path.open(
        "w", encoding="utf-8"
    ) as rej:
        for line in src:
            stripped = line.strip()
            if not stripped:
                continue
            try:
                record = json.loads(stripped)
            except json.JSONDecodeError:
                # Corrupt line (e.g. interrupted pivot write) — log and skip
                # rather than crashing the whole validation pass.
                rej.write(
                    json.dumps({"row_index": None, "reason": "corrupt_json"})
                    + "\n"
                )
                continue
            if record.get("status") != "ok":
                continue
            source_zh = record.get("source_zh", "")
            pivot_en = record.get("pivot_en", "")
            target_vi = (record.get("target_vi") or "").strip()

            reason = validate_pivot_row(source_zh, pivot_en)
            if reason is None and not target_vi:
                reason = "empty_vi"

            if reason is not None:
                rej.write(
                    json.dumps(
                        {"row_index": record.get("row_index"), "reason": reason},
                        ensure_ascii=False,
                    )
                    + "\n"
                )
                continue

            pairs.append(
                Pair(en=_normalize_line(pivot_en), vi=_normalize_line(target_vi))
            )

    return pairs


def split_pairs(
    pairs: list[Pair],
    *,
    val_fraction: float = DEFAULT_VAL_FRACTION,
    seed: int = DEFAULT_SEED,
) -> tuple[list[Pair], list[Pair]]:
    """Deterministically split pairs into (train, val).

    Args:
        pairs: Validated pairs.
        val_fraction: Fraction reserved for validation.
        seed: RNG seed for a reproducible shuffle.

    Returns:
        ``(train, val)`` lists.
    """
    shuffled = list(pairs)
    random.Random(seed).shuffle(shuffled)
    val_size = int(round(len(shuffled) * val_fraction))
    val = shuffled[:val_size]
    train = shuffled[val_size:]
    return train, val


def write_split(pairs: Iterable[Pair], en_path: Path, vi_path: Path) -> int:
    """Write a split to parallel ``.en`` / ``.vi`` files (one pair per line).

    Returns the number of pairs written.
    """
    en_path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with en_path.open("w", encoding="utf-8") as en_f, vi_path.open(
        "w", encoding="utf-8"
    ) as vi_f:
        for pair in pairs:
            en_f.write(pair.en + "\n")
            vi_f.write(pair.vi + "\n")
            count += 1
    return count


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate + split pivot output.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("ml/data/pivot/pivot_output.jsonl"),
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("ml/data/final"),
    )
    parser.add_argument(
        "--rejected",
        type=Path,
        default=None,
        help="Rejected-rows log (default: <out-dir>/pivot_rejected.jsonl).",
    )
    parser.add_argument("--val-fraction", type=float, default=DEFAULT_VAL_FRACTION)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    out_dir: Path = args.out_dir
    rejected = args.rejected or (out_dir / "pivot_rejected.jsonl")

    pairs = validate_and_collect(args.input, rejected)
    total_in = len(pairs)
    if total_in == 0:
        print("No valid pairs after validation — aborting.", file=sys.stderr)
        return 1

    train, val = split_pairs(
        pairs, val_fraction=args.val_fraction, seed=args.seed
    )

    n_train = write_split(train, out_dir / "train.en", out_dir / "train.vi")
    n_val = write_split(val, out_dir / "val.en", out_dir / "val.vi")

    print(f"Validated pairs: {total_in}")
    print(f"Rejected log:    {rejected}")
    print(f"Train pairs:     {n_train} -> {out_dir/'train.en'}, {out_dir/'train.vi'}")
    print(f"Val pairs:       {n_val} -> {out_dir/'val.en'}, {out_dir/'val.vi'}")
    print(f"Val fraction:    {n_val / (n_train + n_val):.4f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
