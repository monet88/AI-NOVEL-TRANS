"""Fine-tune Helsinki-NLP/opus-mt-en-vi for EN→VI novel translation."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from .seq2seq_pipeline import (
    load_parallel_split,
    make_compute_metrics,
    read_parallel_texts,
    tokenize_dataset,
)

MODEL_NAME = "Helsinki-NLP/opus-mt-en-vi"
DEFAULT_OUTPUT_DIR = Path("ml/models/opus-mt-en-vi-finetuned")
DEFAULT_MAX_LENGTH = 512
DEFAULT_BATCH_SIZE = 16
DEFAULT_EPOCHS = 5
DEFAULT_LR = 5e-5
DEFAULT_WARMUP_STEPS = 500
DEFAULT_EVAL_SAMPLES = 512


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fine-tune opus-mt-en-vi.")
    parser.add_argument("--train-en", type=Path, default=Path("ml/data/split/train.en"))
    parser.add_argument("--train-vi", type=Path, default=Path("ml/data/split/train.vi"))
    parser.add_argument("--val-en", type=Path, default=Path("ml/data/split/val.en"))
    parser.add_argument("--val-vi", type=Path, default=Path("ml/data/split/val.vi"))
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--model-name", type=str, default=MODEL_NAME)
    parser.add_argument("--hf-repo", type=str, default=os.getenv("HF_REPO", ""))
    parser.add_argument("--max-source-length", type=int, default=DEFAULT_MAX_LENGTH)
    parser.add_argument("--max-target-length", type=int, default=DEFAULT_MAX_LENGTH)
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS)
    parser.add_argument("--learning-rate", type=float, default=DEFAULT_LR)
    parser.add_argument("--warmup-steps", type=int, default=DEFAULT_WARMUP_STEPS)
    parser.add_argument(
        "--eval-samples",
        type=int,
        default=DEFAULT_EVAL_SAMPLES,
        help="Baseline generation sample size before training; 0 disables baseline.",
    )
    parser.add_argument("--no-fp16", action="store_true")
    parser.add_argument("--push-to-hub", action="store_true")
    parser.add_argument(
        "--resume-from-checkpoint",
        type=str,
        default="auto",
        help="Checkpoint path, 'auto' for latest output-dir checkpoint, or 'none' to start fresh.",
    )
    return parser.parse_args(argv)


def _load_training_modules():
    """Import heavy ML dependencies lazily so helper tests stay lightweight."""
    from transformers import (  # pyright: ignore[reportMissingImports]
        AutoModelForSeq2SeqLM,
        AutoTokenizer,
        DataCollatorForSeq2Seq,
        EarlyStoppingCallback,
        Seq2SeqTrainer,
        Seq2SeqTrainingArguments,
    )

    from transformers.trainer_utils import get_last_checkpoint  # pyright: ignore[reportMissingImports]

    return {
        "AutoModelForSeq2SeqLM": AutoModelForSeq2SeqLM,
        "AutoTokenizer": AutoTokenizer,
        "DataCollatorForSeq2Seq": DataCollatorForSeq2Seq,
        "EarlyStoppingCallback": EarlyStoppingCallback,
        "Seq2SeqTrainer": Seq2SeqTrainer,
        "Seq2SeqTrainingArguments": Seq2SeqTrainingArguments,
        "get_last_checkpoint": get_last_checkpoint,
    }


def _generate_translations(model, tokenizer, sources: list[str], *, batch_size: int) -> list[str]:
    import torch  # pyright: ignore[reportMissingImports]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    model.eval()

    outputs: list[str] = []
    for start in range(0, len(sources), batch_size):
        batch = sources[start : start + batch_size]
        encoded = tokenizer(
            batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=DEFAULT_MAX_LENGTH,
        ).to(device)
        generated = model.generate(**encoded, max_length=DEFAULT_MAX_LENGTH)
        outputs.extend(tokenizer.batch_decode(generated, skip_special_tokens=True))
    return outputs


def _print_baseline(model, tokenizer, val_en: Path, val_vi: Path, *, sample_size: int, batch_size: int) -> None:
    if sample_size <= 0:
        print("Baseline BLEU skipped (--eval-samples=0).")
        return

    from sacrebleu import corpus_bleu, corpus_chrf  # pyright: ignore[reportMissingImports]

    sources, references = read_parallel_texts(val_en, val_vi)
    sources = sources[:sample_size]
    references = references[:sample_size]
    predictions = _generate_translations(model, tokenizer, sources, batch_size=batch_size)
    bleu = corpus_bleu(predictions, [references])
    chrf = corpus_chrf(predictions, [references], word_order=2)
    print(f"Baseline sample BLEU: {bleu.score:.2f}")
    print(f"Baseline sample ChrF++: {chrf.score:.2f}")


def _resolve_resume_checkpoint(output_dir: Path, resume_from_checkpoint: str) -> str | None:
    """Resolve the checkpoint to resume from without hiding missing explicit paths."""
    if resume_from_checkpoint == "none":
        print("Starting fresh; checkpoint resume disabled.")
        return None

    if resume_from_checkpoint != "auto":
        checkpoint = Path(resume_from_checkpoint)
        if not checkpoint.exists():
            raise FileNotFoundError(f"Resume checkpoint not found: {checkpoint}")
        print(f"Resuming from explicit checkpoint: {checkpoint}")
        return str(checkpoint)

    modules = _load_training_modules()
    last_checkpoint = modules["get_last_checkpoint"](str(output_dir)) if output_dir.exists() else None
    if last_checkpoint:
        print(f"Resuming from latest checkpoint: {last_checkpoint}")
        return last_checkpoint

    print(f"No checkpoint found in {output_dir}; starting fresh.")
    return None


def train(args: argparse.Namespace) -> None:
    modules = _load_training_modules()
    tokenizer = modules["AutoTokenizer"].from_pretrained(args.model_name)
    model = modules["AutoModelForSeq2SeqLM"].from_pretrained(args.model_name)

    _print_baseline(
        model,
        tokenizer,
        args.val_en,
        args.val_vi,
        sample_size=args.eval_samples,
        batch_size=args.batch_size,
    )

    train_ds = load_parallel_split(args.train_en, args.train_vi)
    val_ds = load_parallel_split(args.val_en, args.val_vi)
    tokenized_train = tokenize_dataset(
        train_ds,
        tokenizer,
        max_source_length=args.max_source_length,
        max_target_length=args.max_target_length,
    )
    tokenized_val = tokenize_dataset(
        val_ds,
        tokenizer,
        max_source_length=args.max_source_length,
        max_target_length=args.max_target_length,
    )

    data_collator = modules["DataCollatorForSeq2Seq"](
        tokenizer=tokenizer,
        model=model,
        label_pad_token_id=-100,
    )
    compute_metrics = make_compute_metrics(tokenizer)

    training_args = modules["Seq2SeqTrainingArguments"](
        output_dir=str(args.output_dir),
        evaluation_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=3,
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        weight_decay=0.01,
        num_train_epochs=args.epochs,
        warmup_steps=args.warmup_steps,
        predict_with_generate=True,
        fp16=not args.no_fp16,
        logging_steps=100,
        report_to="none",
        load_best_model_at_end=True,
        metric_for_best_model="bleu",
        greater_is_better=True,
        push_to_hub=args.push_to_hub,
        hub_model_id=args.hf_repo or None,
        hub_private_repo=True if args.hf_repo else None,
    )

    trainer = modules["Seq2SeqTrainer"](
        model=model,
        args=training_args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_val,
        processing_class=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
        callbacks=[modules["EarlyStoppingCallback"](early_stopping_patience=3)],
    )

    resume_checkpoint = _resolve_resume_checkpoint(args.output_dir, args.resume_from_checkpoint)
    trainer.train(resume_from_checkpoint=resume_checkpoint)
    trainer.save_model(str(args.output_dir))
    tokenizer.save_pretrained(str(args.output_dir))

    if args.push_to_hub:
        trainer.push_to_hub()


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    train(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
