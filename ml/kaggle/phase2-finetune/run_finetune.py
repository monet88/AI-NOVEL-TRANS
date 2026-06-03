"""Self-contained Kaggle runner for Phase 2 — fine-tune opus-mt-en-vi.

Input dataset must contain:
  train.en, train.vi, val.en, val.vi

Output:
  /kaggle/working/opus-mt-en-vi-finetuned/

The runner only saves Kaggle Output. Upload artifacts to Hugging Face Hub
manually after the run completes.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

TORCH_PACKAGES = (
    "torch==2.2.2+cu121",
    "torchvision==0.17.2+cu121",
    "torchaudio==2.2.2+cu121",
)

TRAIN_PACKAGES = (
    "numpy<2",
    "transformers==4.40.2",
    "datasets==2.19.2",
    "accelerate==0.30.1",
    "sentencepiece>=0.2.0",
    "sacrebleu>=2.4.0",
    "sacremoses>=0.1.1",
    "huggingface-hub>=0.25.0",
)

# Kaggle may assign Tesla P100 (sm_60). Newer PyTorch wheels can drop sm_60,
# while newer Transformers requires torch>=2.6 for .bin checkpoints. Pin the
# older Transformers stack plus NumPy<2 so the P100-compatible torch can load.
subprocess.check_call([
    sys.executable,
    "-m",
    "pip",
    "install",
    "-q",
    "--index-url",
    "https://download.pytorch.org/whl/cu121",
    *TORCH_PACKAGES,
])
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", *TRAIN_PACKAGES])
# Kaggle images can include a newer PEFT package. Transformers imports PEFT when
# present, but this runner does not use LoRA/PEFT and the newer PEFT can require
# newer Accelerate symbols than this pinned P100-compatible stack provides.
subprocess.check_call([sys.executable, "-m", "pip", "uninstall", "-y", "-q", "peft"])

from datasets import Dataset  # noqa: E402  # pyright: ignore[reportMissingImports]
from sacrebleu import corpus_bleu, corpus_chrf  # noqa: E402  # pyright: ignore[reportMissingImports]
from transformers import (  # noqa: E402  # pyright: ignore[reportMissingImports]
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    DataCollatorForSeq2Seq,
    EarlyStoppingCallback,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
)

MODEL_NAME = "Helsinki-NLP/opus-mt-en-vi"
OUTPUT_DIR = Path("/kaggle/working/opus-mt-en-vi-finetuned")
DATASET_FILES = ("train.en", "train.vi", "val.en", "val.vi")
MAX_LENGTH = 512
BATCH_SIZE = 16
EPOCHS = 5
LEARNING_RATE = 5e-5
WARMUP_STEPS = 500
BASELINE_SAMPLES = 512


def find_split_dir() -> Path:
    """Find the Kaggle input directory containing the four split files."""
    candidates = [path for path in Path("/kaggle/input").glob("**/*") if path.is_dir()]
    for candidate in sorted(candidates):
        if all((candidate / name).exists() for name in DATASET_FILES):
            print(f"Using split dataset directory: {candidate}")
            return candidate
    available = sorted(str(path) for path in Path("/kaggle/input").glob("*"))
    raise FileNotFoundError(
        "Could not find split dataset with train.en/train.vi/val.en/val.vi. "
        f"Attach minhthang6789/en-vi-novel-split. Available: {available}"
    )


def read_parallel_texts(en_path: Path, vi_path: Path) -> tuple[list[str], list[str]]:
    en_lines = [line.strip() for line in en_path.read_text(encoding="utf-8").splitlines()]
    vi_lines = [line.strip() for line in vi_path.read_text(encoding="utf-8").splitlines()]
    if len(en_lines) != len(vi_lines):
        raise ValueError(f"Line count mismatch: {en_path}={len(en_lines)}, {vi_path}={len(vi_lines)}")
    return en_lines, vi_lines


def make_dataset(en_path: Path, vi_path: Path) -> Dataset:
    en_lines, vi_lines = read_parallel_texts(en_path, vi_path)
    return Dataset.from_list([
        {"source_text": en, "target_text": vi}
        for en, vi in zip(en_lines, vi_lines, strict=True)
    ])


def tokenize_dataset(dataset: Dataset, tokenizer):
    def encode(examples):
        inputs = tokenizer(examples["source_text"], max_length=MAX_LENGTH, truncation=True)
        labels = tokenizer(text_target=examples["target_text"], max_length=MAX_LENGTH, truncation=True)
        inputs["labels"] = labels["input_ids"]
        return inputs

    return dataset.map(encode, batched=True, remove_columns=dataset.column_names)


def generate_sample(model, tokenizer, sources: list[str], *, batch_size: int) -> list[str]:
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
            max_length=MAX_LENGTH,
        ).to(device)
        generated = model.generate(**encoded, max_length=MAX_LENGTH)
        outputs.extend(tokenizer.batch_decode(generated, skip_special_tokens=True))
    return outputs


def print_baseline(model, tokenizer, split_dir: Path) -> None:
    sources, references = read_parallel_texts(split_dir / "val.en", split_dir / "val.vi")
    sources = sources[:BASELINE_SAMPLES]
    references = references[:BASELINE_SAMPLES]
    predictions = generate_sample(model, tokenizer, sources, batch_size=BATCH_SIZE)
    print(f"Baseline sample BLEU: {corpus_bleu(predictions, [references]).score:.2f}")
    print(f"Baseline sample ChrF++: {corpus_chrf(predictions, [references], word_order=2).score:.2f}")


def make_compute_metrics(tokenizer):
    def compute_metrics(eval_pred):
        predictions = eval_pred.predictions
        if hasattr(predictions, "shape") and len(predictions.shape) == 3:
            predictions = predictions.argmax(axis=-1)
        labels = [
            [token if token != -100 else tokenizer.pad_token_id for token in row]
            for row in eval_pred.label_ids
        ]
        decoded_predictions = tokenizer.batch_decode(predictions, skip_special_tokens=True)
        decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
        refs = [decoded_labels]
        bleu = corpus_bleu(decoded_predictions, refs)
        chrf = corpus_chrf(decoded_predictions, refs, word_order=2)
        return {"bleu": bleu.score, "chrf": chrf.score}

    return compute_metrics


def main() -> int:
    split_dir = find_split_dir()

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
    print_baseline(model, tokenizer, split_dir)

    train_dataset = tokenize_dataset(make_dataset(split_dir / "train.en", split_dir / "train.vi"), tokenizer)
    val_dataset = tokenize_dataset(make_dataset(split_dir / "val.en", split_dir / "val.vi"), tokenizer)
    collator = DataCollatorForSeq2Seq(tokenizer=tokenizer, model=model, label_pad_token_id=-100)

    args = Seq2SeqTrainingArguments(
        output_dir=str(OUTPUT_DIR),
        evaluation_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=3,
        learning_rate=LEARNING_RATE,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        weight_decay=0.01,
        num_train_epochs=EPOCHS,
        warmup_steps=WARMUP_STEPS,
        predict_with_generate=True,
        fp16=True,
        logging_steps=100,
        report_to="none",
        load_best_model_at_end=True,
        metric_for_best_model="bleu",
        greater_is_better=True,
        push_to_hub=False,
    )
    trainer = Seq2SeqTrainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
        data_collator=collator,
        compute_metrics=make_compute_metrics(tokenizer),
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
    )
    trainer.train()
    trainer.save_model(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))
    print(f"Model saved to {OUTPUT_DIR}")
    return 0


raise SystemExit(main())
