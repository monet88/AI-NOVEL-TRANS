"""Shared helpers for Phase 2 seq2seq fine-tuning and evaluation."""

from __future__ import annotations

from pathlib import Path
from typing import Callable, Iterable, Sequence


def read_parallel_texts(en_path: Path, vi_path: Path) -> tuple[list[str], list[str]]:
    """Read aligned EN/VI line files and validate the row counts."""
    en_lines = [line.strip() for line in en_path.read_text(encoding="utf-8").splitlines()]
    vi_lines = [line.strip() for line in vi_path.read_text(encoding="utf-8").splitlines()]

    if len(en_lines) != len(vi_lines):
        raise ValueError(
            f"Line count mismatch: {en_path} has {len(en_lines)} lines, "
            f"{vi_path} has {len(vi_lines)} lines"
        )

    if not en_lines:
        raise ValueError(f"Empty parallel dataset: {en_path} / {vi_path}")

    return en_lines, vi_lines


def build_parallel_records(
    en_lines: Sequence[str],
    vi_lines: Sequence[str],
) -> list[dict[str, str]]:
    """Convert aligned lists into row dictionaries for datasets.Dataset."""
    if len(en_lines) != len(vi_lines):
        raise ValueError("Parallel inputs must have the same length")
    return [
        {"source_text": en, "target_text": vi}
        for en, vi in zip(en_lines, vi_lines, strict=True)
    ]


def load_parallel_split(en_path: Path, vi_path: Path):
    """Load a parallel text split as a Hugging Face Dataset."""
    from datasets import Dataset  # pyright: ignore[reportMissingImports]

    en_lines, vi_lines = read_parallel_texts(en_path, vi_path)
    return Dataset.from_list(build_parallel_records(en_lines, vi_lines))


def tokenize_parallel_batch(
    examples: dict[str, list[str]],
    tokenizer,
    *,
    max_source_length: int,
    max_target_length: int,
) -> dict[str, list[list[int]]]:
    """Tokenize an aligned batch with source and target texts."""
    model_inputs = tokenizer(
        examples["source_text"],
        max_length=max_source_length,
        truncation=True,
    )
    labels = tokenizer(
        text_target=examples["target_text"],
        max_length=max_target_length,
        truncation=True,
    )
    model_inputs["labels"] = labels["input_ids"]
    return model_inputs


def tokenize_dataset(dataset, tokenizer, *, max_source_length: int, max_target_length: int):
    """Map tokenization over a parallel dataset and drop raw text columns."""

    def _encode(examples: dict[str, list[str]]) -> dict[str, list[list[int]]]:
        return tokenize_parallel_batch(
            examples,
            tokenizer,
            max_source_length=max_source_length,
            max_target_length=max_target_length,
        )

    return dataset.map(_encode, batched=True, remove_columns=dataset.column_names)


def _replace_label_padding(labels: Sequence[Sequence[int]], pad_token_id: int) -> list[list[int]]:
    return [
        [token if token != -100 else pad_token_id for token in row]
        for row in labels
    ]


def _as_token_sequences(predictions) -> Sequence[Sequence[int]]:
    if hasattr(predictions, "shape") and len(predictions.shape) == 3:
        return predictions.argmax(axis=-1)
    return predictions


def make_compute_metrics(
    tokenizer,
    *,
    bleu_metric=None,
    chrf_metric=None,
) -> Callable[[object], dict[str, float]]:
    """Build a compute_metrics callback for Seq2SeqTrainer.

    Optional metric callables are injected for tests. They must accept
    ``(sys, refs)`` and return an object with a ``score`` attribute.
    """
    if bleu_metric is None or chrf_metric is None:
        from sacrebleu import corpus_bleu, corpus_chrf  # pyright: ignore[reportMissingImports]

        bleu_metric = bleu_metric or corpus_bleu
        chrf_metric = chrf_metric or (lambda sys, refs: corpus_chrf(sys, refs, word_order=2))

    def _compute(eval_pred) -> dict[str, float]:
        predictions = _as_token_sequences(eval_pred.predictions)
        labels = _replace_label_padding(eval_pred.label_ids, tokenizer.pad_token_id)

        decoded_predictions = tokenizer.batch_decode(
            predictions, skip_special_tokens=True
        )
        decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
        references = [decoded_labels]

        bleu = bleu_metric(decoded_predictions, references)
        chrf = chrf_metric(decoded_predictions, references)
        gen_lengths = [len(text.split()) for text in decoded_predictions]
        avg_len = sum(gen_lengths) / max(1, len(gen_lengths))

        return {
            "bleu": float(bleu.score),
            "chrf": float(chrf.score),
            "gen_len": float(avg_len),
        }

    return _compute


def read_translations(text_path: Path) -> list[str]:
    """Read a single-column text file and drop blank lines."""
    return [line.strip() for line in text_path.read_text(encoding="utf-8").splitlines() if line.strip()]


def chunked(items: Sequence[str], size: int) -> Iterable[list[str]]:
    """Yield contiguous chunks from a sequence."""
    if size <= 0:
        raise ValueError("Chunk size must be positive")
    for start in range(0, len(items), size):
        yield list(items[start : start + size])
