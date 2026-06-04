"""Convert fine-tuned MarianMT model to CTranslate2 INT8 and validate."""

import gc
import json
import os
import subprocess
import sys
import time
from pathlib import Path

MODEL_DIR = Path(os.environ.get(
    "CT2_MODEL_DIR",
    str(Path(__file__).resolve().parent.parent.parent / "checkpoints" / "opus-mt-en-vi-finetuned"),
))
CT2_OUTPUT_DIR = Path(os.environ.get(
    "CT2_OUTPUT_DIR",
    str(MODEL_DIR.parent / "ct2-opus-mt-en-vi-int8"),
))
QUANTIZATION = os.environ.get("CT2_QUANT", "int8_float32")
BENCHMARK_SAMPLES = int(os.environ.get("CT2_BENCHMARK_SAMPLES", "1000"))
VAL_EN = Path(os.environ.get("CT2_VAL_EN", str(MODEL_DIR.parent.parent / "data" / "val.en")))
VAL_VI = Path(os.environ.get("CT2_VAL_VI", str(MODEL_DIR.parent.parent / "data" / "val.vi")))


def clear_cache() -> None:
    gc.collect()
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except ImportError:
        pass


def convert_model() -> None:
    print(f"Converting {MODEL_DIR} → {CT2_OUTPUT_DIR} ({QUANTIZATION})", flush=True)
    if CT2_OUTPUT_DIR.exists():
        print(f"Output dir exists, removing: {CT2_OUTPUT_DIR}", flush=True)
        import shutil
        shutil.rmtree(CT2_OUTPUT_DIR)
    CT2_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            sys.executable, "-m", "ctranslate2.converters.transformers",
            "--model", str(MODEL_DIR),
            "--output_dir", str(CT2_OUTPUT_DIR),
            "--quantization", QUANTIZATION,
            "--force",
        ],
        check=True,
    )
    size_mb = sum(p.stat().st_size for p in CT2_OUTPUT_DIR.rglob("*") if p.is_file()) / 1024**2
    print(f"Conversion done. CT2 model size: {size_mb:.1f} MB", flush=True)
    print(f"Files: {sorted(p.name for p in CT2_OUTPUT_DIR.iterdir())}", flush=True)


def benchmark_speed() -> dict:
    print(f"\nBenchmarking speed on {BENCHMARK_SAMPLES} samples...", flush=True)
    import ctranslate2
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR))
    translator = ctranslate2.Translator(
        str(CT2_OUTPUT_DIR),
        device="cpu",
        compute_type=QUANTIZATION,
        intra_threads=min(4, max(1, os.cpu_count() or 1)),
        inter_threads=1,
    )

    with open(VAL_EN, encoding="utf-8") as f:
        sources = [line.strip() for _, line in zip(range(BENCHMARK_SAMPLES), f) if line.strip()]

    start = time.monotonic()
    for source in sources:
        encoded = tokenizer.convert_ids_to_tokens(tokenizer(source, truncation=True, max_length=256)["input_ids"])
        _ = translator.translate_batch([encoded], max_batch_size=1, beam_size=1)
    elapsed = time.monotonic() - start

    total_tokens = sum(len(tokenizer(s, truncation=False).get("input_ids", [])) for s in sources)
    results = {
        "samples": len(sources),
        "total_seconds": round(elapsed, 2),
        "tokens_per_second": round(total_tokens / elapsed, 1),
        "samples_per_second": round(len(sources) / elapsed, 2),
    }
    print(f"Speed: {results['tokens_per_second']} tok/s, {results['samples_per_second']} samples/s", flush=True)
    return results


def benchmark_quality() -> dict:
    print(f"\nBenchmarking quality on {BENCHMARK_SAMPLES} samples...", flush=True)
    import ctranslate2
    import sacrebleu
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR))
    translator = ctranslate2.Translator(
        str(CT2_OUTPUT_DIR),
        device="cpu",
        compute_type=QUANTIZATION,
        intra_threads=min(4, max(1, os.cpu_count() or 1)),
        inter_threads=1,
    )

    with open(VAL_EN, encoding="utf-8") as f_en, open(VAL_VI, encoding="utf-8") as f_vi:
        pairs = [
            (en.strip(), vi.strip())
            for _, (en, vi) in zip(range(BENCHMARK_SAMPLES), zip(f_en, f_vi))
            if en.strip() and vi.strip()
        ]

    sources = [s for s, _ in pairs]
    references = [r for _, r in pairs]
    predictions = []

    start = time.monotonic()
    for source in sources:
        encoded = tokenizer.convert_ids_to_tokens(tokenizer(source, truncation=True, max_length=256)["input_ids"])
        result = translator.translate_batch([encoded], max_batch_size=1, beam_size=4)
        predictions.append(tokenizer.decode(tokenizer.convert_tokens_to_ids(result[0].hypotheses[0]), skip_special_tokens=True))
    elapsed = time.monotonic() - start

    bleu = sacrebleu.corpus_bleu(predictions, [references])
    chrf = sacrebleu.corpus_chrf(predictions, [references], word_order=2)

    results = {
        "bleu": round(bleu.score, 2),
        "chrfpp": round(chrf.score, 2),
        "samples": len(sources),
        "seconds": round(elapsed, 1),
        "tokens_per_second": round(sum(len(tokenizer(s, truncation=False).get("input_ids", [])) for s in sources) / elapsed, 1),
    }
    print(f"BLEU: {results['bleu']} | ChrF++: {results['chrfpp']} | speed: {results['tokens_per_second']} tok/s", flush=True)
    return results


def main() -> None:
    print("=== CTranslate2 Export ===", flush=True)
    print(f"Model: {MODEL_DIR}", flush=True)
    print(f"Output: {CT2_OUTPUT_DIR}", flush=True)
    print(f"Quantization: {QUANTIZATION}", flush=True)
    print(f"Benchmark samples: {BENCHMARK_SAMPLES}", flush=True)

    clear_cache()

    # Step 1: Convert
    convert_model()

    # Step 2: Speed benchmark
    speed = benchmark_speed()

    # Step 3: Quality benchmark
    quality = benchmark_quality()

    # Save report
    report = {"conversion": {"src": str(MODEL_DIR), "dst": str(CT2_OUTPUT_DIR), "quantization": QUANTIZATION}, "speed": speed, "quality": quality}
    report_path = CT2_OUTPUT_DIR.parent / "ct2-export-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nReport saved: {report_path}", flush=True)

    # Gate
    print(f"\nQuality gate: BLEU {quality['bleu']} | speed {speed['tokens_per_second']} tok/s", flush=True)
    print("=== CT2 Export complete ===", flush=True)


if __name__ == "__main__":
    main()
