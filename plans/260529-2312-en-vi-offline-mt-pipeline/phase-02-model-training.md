---
phase: 2
title: "Fine-tune"
status: in_progress
priority: P1
effort: "2-3h"
dependencies: [1]
---

# Phase 2: Fine-tune

> **Ready-to-start context (2026-06-01 09:45):** Phase 1 data is now complete and split.
> - `ml/data/split/train.en` / `train.vi`: 328,169 lines
> - `ml/data/split/val.en` / `val.vi`: 17,272 lines
> - Validation reject rate after heuristic fix: 0.109%
> - Kaggle pivot output is preserved under `ml/data/pivot/pivot/`
>
> **Next kickoff step:** prepare Kaggle fine-tune notebook + CLI flow around the existing split files, then confirm whether to start GPU training.

## Overview

> **Current proof (2026-06-03):** Colab L4 run completed 1 epoch and saved artifacts to Drive.
> - Training output dir: `/content/drive/MyDrive/ai-novel-trans-phase2/checkpoints/opus-mt-en-vi-finetuned`
> - Epoch-end log: `eval_bleu=34.29`, `eval_chrf=54.54`, `train_loss=1.959`
> - Quick eval via `ml.train.evaluate --limit 256`: `BLEU=33.29`, `ChrF++=54.13`, `exit code=0`
> - Saved final model files exist in Drive root artifact dir; resume checkpoint exists at `checkpoint-20511/`
> - Setup cell now auto-installs missing `transformers`, `datasets`, `sacrebleu`, `sacremoses`, and `sentencepiece`
> - Colab Drive recovery is now documented: hard-remount stale `/content/drive`, verify `code/` + `data`, recreate `/content/ai-novel-trans-runtime` before eval/training after reconnect

Fine-tune Helsinki-NLP/opus-mt-en-vi on 347k domain-specific EN→VI pairs using Kaggle T4 GPU (16GB VRAM). Keep original tokenizer unchanged. Target: 2-3h, BLEU ≥ 30 on val set.

Execution mode for this phase: Claude prepares and runs Kaggle CLI / notebook workflow commands directly. User approval required before starting GPU-consuming training runs.

## Requirements

- Functional: Fine-tuned EN→VI model with BLEU ≥ 30 on val set
- Functional: Keep original Helsinki tokenizer unchanged
- Non-functional: Completes within 3h on Kaggle T4 (16GB VRAM)

## Architecture

```
Input: train.en, train.vi, val.en, val.vi (from Phase 1)
  │
  ├─ [Step 1] Load Helsinki-NLP/opus-mt-en-vi (pretrained)
  │   Already knows EN→VI general translation
  │   Keep tokenizer as-is (~60k vocab)
  │
  ├─ [Step 2] Fine-tune on Kaggle T4
  │   lr 5e-5, batch 16, fp16
  │   3-5 epochs, ~2-3h
  │
  └─ Output: fine-tuned model (HuggingFace format)
```

## Related Code Files

- Create: `ml/train/seq2seq_pipeline.py` — shared dataset/tokenization/metrics helpers for training + evaluation
- Create: `ml/train/finetune_opus_mt.py` — Main fine-tuning script
- Create: `ml/train/evaluate.py` — BLEU evaluation on val set
- Create: `ml/train/requirements.txt` — transformers, sentencepiece, sacrebleu, torch
- Create: `ml/kaggle/phase2-finetune/run_finetune.py` — self-contained Kaggle runner with GPU enabled
- Create: `ml/kaggle/phase2-finetune/kernel-metadata.json` — private Kaggle script kernel metadata

## Implementation Steps

0. **Preparation status**
   - Phase 2 script scaffolding exists locally under `ml/train/` and `ml/kaggle/phase2-finetune/`
   - Compile check passed: `python3 -m py_compile ml/train/__init__.py ml/train/seq2seq_pipeline.py ml/train/finetune_opus_mt.py ml/train/evaluate.py ml/tests/test_seq2seq_pipeline.py ml/kaggle/phase2-finetune/run_finetune.py`
   - Split dataset metadata exists at `ml/data/split/dataset-metadata.json`
   - Kaggle dataset `minhthang6789/en-vi-novel-split` is created and `ready`
   - Private Hugging Face model repo `richardadam/opus-mt-en-vi-novel-finetuned` is created for Phase 2 output
   - Kaggle runner saves model artifacts to Kaggle Output only; Hugging Face Hub upload is manual after download
   - No automatic Hub upload is configured in the Kaggle runner; after training, download Kaggle Output and push to `richardadam/opus-mt-en-vi-novel-finetuned` manually if desired
   - Training scripts use epoch-aligned evaluation/checkpointing so `load_best_model_at_end=True` can select the best BLEU checkpoint without `eval_strategy` / `save_strategy` mismatch

1. **Load pretrained model**
   - Download `Helsinki-NLP/opus-mt-en-vi` from HuggingFace
   - Measure baseline BLEU on val set (expected ~20-25 general domain)
   - Confirm: ~74M params, MarianMT architecture

2. **Fine-tuning** (Kaggle T4, 16GB VRAM)
   - DataLoader: batch size 16, no gradient accumulation needed (effective batch 16)
   - Optimizer: AdamW, lr=5e-5, weight_decay=0.01
   - Scheduler: linear warmup 500 steps, then cosine decay
   - Mixed precision (fp16)
   - Checkpoint after each epoch; this matches epoch evaluation and keeps `load_best_model_at_end=True` compatible across Transformers versions
   - Early stopping: patience 3 epochs on val loss
   - Runtime note from P100 run: loss decreased normally (`5.03` → `2.74` by `epoch=0.07`), but throughput was about 31 minutes for 0.07 epoch, roughly 7.4h/epoch; next optimization run should start with 1-2 epochs to get checkpoint/eval proof before attempting longer training
   - Store output in Kaggle Output; do not auto-upload during the kernel run
   - Push target after manual upload: private repo `richardadam/opus-mt-en-vi-novel-finetuned`
   - Save output to Kaggle Output → manually push to HuggingFace Hub after download

3. **Evaluation**
   - BLEU (sacrebleu) on val set after each epoch
   - ChrF++ as secondary metric
   - Target: BLEU ≥ 30 (domain-adapted improvement over baseline)

4. **Save model**
   - Save best checkpoint: `model.save_pretrained()`
   - Keep original tokenizer alongside (unchanged)
   - Upload to HuggingFace Hub private repo `richardadam/opus-mt-en-vi-novel-finetuned` using `HF_TOKEN` from Kaggle Secrets or environment variable

5. **Fallback if BLEU < 30**
   - First retry fine-tune with lr 3e-5 and/or up to 8 epochs
   - If still below BLEU 30, revisit custom tokenizer + train-from-scratch approach from `docs/brainstorm/EN-VI-novel-mt-brainstorm.md`
   - Document tradeoff: fine-tuning is faster/simpler; custom tokenizer/model may improve domain vocabulary but adds 8-12h+ training work

## Success Criteria

- [ ] Pretrained opus-mt-en-vi loaded, baseline BLEU measured
- [ ] Fine-tuning completes within 3h on Kaggle T4
- [ ] Val BLEU ≥ 30
- [ ] No OOM errors (fp16 + batch 16)
- [ ] Model saved in HuggingFace format
- [ ] Checkpoints saved after each epoch with best BLEU checkpoint reloaded at training end
- [ ] Model manually pushed to HuggingFace Hub from Kaggle Output if Hub distribution is needed

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| OOM on Kaggle T4/P100 (16GB) | Batch size 16 + fp16, enough headroom for ~74M Marian model |
| PyTorch CUDA wheel incompatible with Kaggle P100 | Kaggle runner pins `torch==2.2.2+cu121` from the PyTorch CUDA 12.1 index because newer wheels can drop sm_60 support and trigger `cudaErrorNoKernelImageForDevice` |
| Dependency stack conflict after P100 torch pin | Kaggle runner pins `transformers==4.40.2`, `datasets==2.19.2`, `accelerate==0.30.1`, and `numpy<2` so torch 2.2 can load Marian checkpoints without the newer torch-load CVE guard or NumPy 2 ABI issue; it also uninstalls preloaded `peft` because Phase 2 does not use LoRA and newer PEFT can require newer Accelerate symbols than this pinned stack provides |
| Slow P100 throughput | Current P100 run trains normally but only reached about `epoch=0.07` after ~31 minutes; next run should use 1-2 epochs first, capture checkpoint/eval proof, then decide whether a longer continuation run is worth the Kaggle quota |
| Kaggle session timeout/disconnect | Current P100 throughput may exceed original 2-3h estimate; keep Kaggle Output checkpointing and prefer shorter proof runs before longer training |
| Kaggle quota (30h/week) | Single run ~3h, leaves room for reruns |
| HuggingFace token leaked | Use Kaggle Secrets / `HF_TOKEN`; never paste into notebook cells committed or shared |
| Catastrophic forgetting | Low lr (5e-5), monitor general BLEU |
| BLEU < 30 | Try lr 3e-5, increase epochs to 8; if still below target, fallback to custom tokenizer/train-from-scratch approach from brainstorm |
