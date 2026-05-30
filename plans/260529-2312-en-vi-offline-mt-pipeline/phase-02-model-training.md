---
phase: 2
title: "Fine-tune"
status: pending
priority: P1
effort: "2-3h"
dependencies: [1]
---

# Phase 2: Fine-tune

## Overview

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

- Create: `ml/train/finetune_opus_mt.py` — Main fine-tuning script
- Create: `ml/train/evaluate.py` — BLEU evaluation on val set
- Create: `ml/train/requirements.txt` — transformers, sentencepiece, sacrebleu, torch

## Implementation Steps

1. **Load pretrained model**
   - Download `Helsinki-NLP/opus-mt-en-vi` from HuggingFace
   - Measure baseline BLEU on val set (expected ~20-25 general domain)
   - Confirm: ~74M params, MarianMT architecture

2. **Fine-tuning** (Kaggle T4, 16GB VRAM)
   - DataLoader: batch size 16, no gradient accumulation needed (effective batch 16)
   - Optimizer: AdamW, lr=5e-5, weight_decay=0.01
   - Scheduler: linear warmup 500 steps, then cosine decay
   - Mixed precision (fp16)
   - Checkpoint every epoch plus `save_steps=500` to survive mid-epoch disconnects
   - Early stopping: patience 3 epochs on val loss
   - Target: 3-5 epochs, ~2-3h total
   - Store HuggingFace token in Kaggle Secrets (`HF_TOKEN`); never paste token into notebook/script
   - Save output to Kaggle Output → push to HuggingFace Hub

3. **Evaluation**
   - BLEU (sacrebleu) on val set after each epoch
   - ChrF++ as secondary metric
   - Target: BLEU ≥ 30 (domain-adapted improvement over baseline)

4. **Save model**
   - Save best checkpoint: `model.save_pretrained()`
   - Keep original tokenizer alongside (unchanged)
   - Upload to HuggingFace Hub (private repo initially) using `HF_TOKEN` from Kaggle Secrets or environment variable

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
- [ ] Checkpoints saved every epoch and every 500 steps
- [ ] Model pushed to HuggingFace Hub from Kaggle Output

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| OOM on Kaggle T4 (16GB) | Batch size 16 + fp16, plenty of headroom |
| Kaggle session timeout/disconnect | Training ~2-3h, below 12h hard limit; save every 500 steps to limit lost work |
| Kaggle quota (30h/week) | Single run ~3h, leaves room for reruns |
| HuggingFace token leaked | Use Kaggle Secrets / `HF_TOKEN`; never paste into notebook cells committed or shared |
| Catastrophic forgetting | Low lr (5e-5), monitor general BLEU |
| BLEU < 30 | Try lr 3e-5, increase epochs to 8; if still below target, fallback to custom tokenizer/train-from-scratch approach from brainstorm |
