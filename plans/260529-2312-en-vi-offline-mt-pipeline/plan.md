---
title: "EN-VI Offline MT Pipeline"
description: "Build offline EN→VI translation for murim/xianxia novels using fine-tuned opus-mt-en-vi + CTranslate2, integrated into existing React web app via FastAPI backend"
status: pending
priority: P1
branch: "main"
tags: [ml, nmt, fastapi, ctranslate2, opus-mt]
blockedBy: []
blocks: []
created: "2026-05-29T16:13:50.461Z"
createdBy: "ck:plan"
source: skill
---

# EN-VI Offline MT Pipeline

## Overview

Build an offline EN→VI machine translation pipeline for murim/võ hiệp + xianxia novel domain. Fine-tune Helsinki-NLP/opus-mt-en-vi on 347k pivoted pairs from ngocdang83/tran-vi-teacher. Deploy via CTranslate2 INT8 (~60 tok/s CPU) behind FastAPI. Glossary handled via deterministic post-processing (no placeholder tokens in model).

## Key Decisions

| Decision | Choice |
|----------|--------|
| Base model | Helsinki-NLP/opus-mt-en-vi (pretrained, ~74M params) |
| Dataset | ngocdang83/tran-vi-teacher (347k ZH→VI, public, clean) + Gemini pivot ZH→EN |
| Tokenizer | Keep Helsinki original (~60k vocab), no modifications |
| Glossary | Post-processing at app layer (deterministic replace, no placeholder tokens) |
| Runtime | CTranslate2 INT8, ~60 tok/s CPU |
| Backend | FastAPI + CTranslate2 runtime |
| Translation modes | Pure Offline + Hybrid MT→LLM |
| Train env | Local RTX 2060S (8GB VRAM, 32GB RAM) |
| Domain | Murim/Võ hiệp + xianxia |
| Demo | HF Space (Gradio) + web app integration |

## Phases

| Phase | Name | Status | Effort | Env |
|-------|------|--------|--------|-----|
| 1 | [Data Pivot](./phase-01-data-preparation.md) | Pending | 4-6h | Local |
| 2 | [Fine-tune](./phase-02-model-training.md) | Pending | 2-3h | Local RTX 2060S |
| 3 | [Export + Deploy](./phase-03-ctranslate2-export.md) | Pending | 30min | Local |
| 4 | [FastAPI Backend](./phase-04-fastapi-backend.md) | Pending | 4-6h | Local |
| 5 | [Web App Integration](./phase-05-web-app-integration.md) | Pending | 4-6h | Local |
| 6 | [Demo and Testing](./phase-06-demo-and-testing.md) | Pending | 3-4h | Local + HF |

## Total Estimates

- **Time:** ~6-10h (ML pipeline) + ~12h (app integration)
- **Cost:** ~$3.50 (Gemini pivot only)
- **Hardware:** RTX 2060S (8GB VRAM) for training, CPU for inference

## ML Pipeline (3 steps)

```
Step 1: PIVOT (~4-6h, ~$3.50)
  Input:  ngocdang83/tran-vi-teacher (347k ZH→VI, clean)
  Action: Gemini Flash-Lite dịch ZH→EN concurrent
  Output: 347k cặp EN↔VI

Step 2: FINE-TUNE (~2-3h, $0)
  Input:  347k EN→VI + opus-mt-en-vi pretrained
  Output: Model fine-tuned cho murim/novel domain

Step 3: EXPORT (~30min, $0)
  Export: CTranslate2 INT8
  Deploy: HuggingFace Hub + Space (Gradio)
```

## Glossary Strategy (Post-processing)

```
Runtime:
1. PRE: Scan EN input → match glossary terms
2. TRANSLATE: Send full EN text through model
3. POST: Force-replace terms in VI output with glossary translations

Benefits: Deterministic, no retraining needed, glossary = JSON file
```

## Dependencies

- ngocdang83/tran-vi-teacher (347k ZH→VI, public on HuggingFace)
- Gemini Flash-Lite API key (~$3.50 budget)
- RTX 2060S GPU (8GB VRAM) for local training
- HuggingFace account (model hosting + Spaces demo)

## Risk Summary

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Pivot EN quality (translationese) | Medium | Murim/xianxia EN is mostly translated from ZH anyway |
| RTX 2060S OOM (8GB VRAM) | Low | Batch size 8 + gradient accumulation + fp16 |
| Post-processing glossary misses context | Medium | Longest-match-first + case-insensitive; hybrid mode LLM handles nuance |
| 347k insufficient for fine-tuning | Low | Pretrained model already knows EN→VI; 347k is domain adaptation only |
