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

Fine-tune Helsinki-NLP/opus-mt-en-vi on 347k domain-specific EN→VI pairs using local RTX 2060S. Keep original tokenizer unchanged. Target: 2-3h, BLEU ≥ 30 on val set.

## Requirements

- Functional: Fine-tuned EN→VI model with BLEU ≥ 30 on val set
- Functional: Keep original Helsinki tokenizer unchanged
- Non-functional: Completes within 3h on RTX 2060S (8GB VRAM)

## Architecture

```
Input: train.en, train.vi, val.en, val.vi (from Phase 1)
  │
  ├─ [Step 1] Load Helsinki-NLP/opus-mt-en-vi (pretrained)
  │   Already knows EN→VI general translation
  │   Keep tokenizer as-is (~60k vocab)
  │
  ├─ [Step 2] Fine-tune on RTX 2060S
  │   lr 5e-5, batch 8, grad accum 4, fp16
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

2. **Fine-tuning** (RTX 2060S, 8GB VRAM)
   - DataLoader: batch size 8, gradient accumulation 4 (effective batch 32)
   - Optimizer: AdamW, lr=5e-5, weight_decay=0.01
   - Scheduler: linear warmup 500 steps, then cosine decay
   - Mixed precision (fp16) to fit in 8GB VRAM
   - Checkpoint every epoch
   - Early stopping: patience 3 epochs on val loss
   - Target: 3-5 epochs, ~2-3h total

3. **Evaluation**
   - BLEU (sacrebleu) on val set after each epoch
   - ChrF++ as secondary metric
   - Target: BLEU ≥ 30 (domain-adapted improvement over baseline)

4. **Save model**
   - Save best checkpoint: `model.save_pretrained()`
   - Keep original tokenizer alongside (unchanged)
   - Upload to HuggingFace Hub (private repo initially)

## Success Criteria

- [ ] Pretrained opus-mt-en-vi loaded, baseline BLEU measured
- [ ] Fine-tuning completes within 3h on RTX 2060S
- [ ] Val BLEU ≥ 30
- [ ] No OOM errors (fp16 + batch 8 + grad accum 4)
- [ ] Model saved in HuggingFace format
- [ ] Checkpoints saved every epoch

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| OOM on RTX 2060S (8GB) | Batch size 8 + gradient accumulation 4 + fp16 |
| Catastrophic forgetting | Low lr (5e-5), monitor general BLEU |
| BLEU < 30 | Try lr 3e-5, increase epochs to 8, or add more data |
