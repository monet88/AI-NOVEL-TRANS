"""Evaluate an EN→VI seq2seq model on a parallel validation split."""

from __future__ import annotations

import argparse
from pathlib import Path

from .seq2seq_pipeline import chunked, read_parallel_texts

DEFAULT_BATCH_SIZE = 16
DEFAULT_MAX_LENGTH = 512
DEFAULT_BLEU_THRESHOLD = 30.0


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate an EN→VI model.")
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--val-en", type=Path, default=Path("ml/data/split/val.en"))
    parser.add_argument("--val-vi", type=Path, default=Path("ml/data/split/val.vi"))
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--max-length", type=int, default=DEFAULT_MAX_LENGTH)
    parser.add_argument("--bleu-threshold", type=float, default=DEFAULT_BLEU_THRESHOLD)
    parser.add_argument("--limit", type=int, default=None)
    return parser.parse_args(argv)


def generate_predictions(
    model,
    tokenizer,
    sources: list[str],
    *,
    batch_size: int,
    max_length: int,
) -> list[str]:
    """Generate model translations for source texts."""
    import torch  # pyright: ignore[reportMissingImports]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    model.eval()

    predictions: list[str] = []
    for batch in chunked(sources, batch_size):
        encoded = tokenizer(
            batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=max_length,
        ).to(device)
        outputs = model.generate(**encoded, max_length=max_length)
        predictions.extend(tokenizer.batch_decode(outputs, skip_special_tokens=True))
    return predictions


def evaluate_model(args: argparse.Namespace) -> tuple[float, float]:
    """Load a model, generate predictions, and return BLEU + ChrF++."""
    from sacrebleu import corpus_bleu, corpus_chrf  # pyright: ignore[reportMissingImports]
    from transformers import (  # pyright: ignore[reportMissingImports]
        AutoModelForSeq2SeqLM,
        AutoTokenizer,
    )

    sources, references = read_parallel_texts(args.val_en, args.val_vi)
    if args.limit is not None:
        sources = sources[: args.limit]
        references = references[: args.limit]

    tokenizer = AutoTokenizer.from_pretrained(str(args.model))
    model = AutoModelForSeq2SeqLM.from_pretrained(str(args.model))
    predictions = generate_predictions(
        model,
        tokenizer,
        sources,
        batch_size=args.batch_size,
        max_length=args.max_length,
    )

    bleu = corpus_bleu(predictions, [references])
    chrf = corpus_chrf(predictions, [references], word_order=2)
    return float(bleu.score), float(chrf.score)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    bleu, chrf = evaluate_model(args)
    print(f"BLEU: {bleu:.2f}")
    print(f"ChrF++: {chrf:.2f}")
    if bleu < args.bleu_threshold:
        print(f"BLEU below target: {bleu:.2f} < {args.bleu_threshold:.2f}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
