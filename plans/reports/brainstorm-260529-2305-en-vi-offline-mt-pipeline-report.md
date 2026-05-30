# Brainstorm Report: EN→VI Offline MT Pipeline

> **Date:** 2026-05-29  
> **Status:** Complete  
> **Next:** `/ck:plan` when ready to implement

---

## Problem Statement

Build offline EN→VI translation model for xianxia/wuxia novel domain. Must integrate with existing AI-NOVEL-TRANS web app (React + Vite) that currently uses LLM APIs (Gemini/DeepSeek/OpenAI).

## Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Architecture | MarianMT 57M (8enc+2dec), BPE 32k | Proven by HachimiMT ZH→VI |
| 2 | Dataset | Pivot: hirashiba ZH→VI + Gemini ZH→EN → 500k EN→VI | No EN→VI novel dataset exists; pivot is valid |
| 3 | Pivot location | Local machine | No session timeout, easy resume |
| 4 | Proper nouns in pivot | Keep pinyin in Gemini prompt | Model learns pinyin→Hán-Việt mapping |
| 5 | Glossary | Placeholder injection (`<<T1>>`) trained into model | Industry standard (Amazon/SAP/TULUN) |
| 6 | App integration | FastAPI backend + new `local-mt` provider | Matches existing multi-provider pattern |
| 7 | Translation modes | Pure Offline ($0) + Hybrid MT→LLM (~$0.01/ch) | User choice in UI |
| 8 | LLM post-edit | Gemini Flash, "polish fluency, keep terms" | TULUN/RWS pattern, 80-90% cost savings vs LLM-only |
| 9 | Quality gate | Optional heuristic to skip LLM for good segments | RWS 3-iteration pattern |
| 10 | Western fantasy | Not in v1 | Fine-tune later if needed |
| 11 | Train env | Kaggle P100 free, 8-12h | 30h/week free GPU |
| 12 | Export | CTranslate2 INT8, ~60 tok/s CPU | Proven runtime |
| 13 | Demo | HF Space (Gradio) + web app integration | Free hosting |

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────┐
│ DATA PREPARATION                                        │
├─────────────────────────────────────────────────────────┤
│ 1. Filter hirashiba 10M → 500k clean ZH→VI (Kaggle CPU)│
│ 2. Pivot: Gemini Flash-Lite ZH→EN (local, ~$3)         │
│ 3. Augment: add placeholder tokens to ~10-20% data     │
├─────────────────────────────────────────────────────────┤
│ TRAINING                                                │
├─────────────────────────────────────────────────────────┤
│ 4. Train MarianMT 57M on Kaggle P100 (8-12h)           │
│ 5. Export CTranslate2 INT8                              │
├─────────────────────────────────────────────────────────┤
│ DEPLOYMENT                                              │
├─────────────────────────────────────────────────────────┤
│ 6. FastAPI server (CTranslate2 runtime)                 │
│ 7. Web app: add local-mt provider (2 modes)             │
│ 8. HF Space demo (Gradio)                              │
└─────────────────────────────────────────────────────────┘
```

## Translation Modes (Runtime)

### Mode 1: Pure Offline
```
EN input → placeholder inject → MarianMT → placeholder replace → VI output
Cost: $0 | Speed: ~60 tok/s | Quality: Good (80-90%)
```

### Mode 2: Hybrid (MT + LLM)
```
EN input → placeholder inject → MarianMT → placeholder replace → [quality gate] → LLM polish → VI output
Cost: ~$0.01/chapter | Speed: slower | Quality: High (95%+)
```

## Cost & Timeline

| Step | Env | Time | Cost |
|------|-----|------|------|
| Filter 10M rows | Kaggle CPU | 2-3h | $0 |
| Pivot 500k via Gemini | Local | 4-8h | ~$3 |
| Augment placeholders | Local | 1-2h | $0 |
| Train MarianMT | Kaggle P100 | 8-12h | $0 |
| Export CTranslate2 | Kaggle CPU | 30min | $0 |
| FastAPI server | Local | 4-6h dev | $0 |
| Web app integration | Local | 4-6h dev | $0 |
| **TOTAL** | | **~3-4 days** | **~$3** |

## Research Backing

- **TULUN (2025)**: Open-source MT + LLM post-edit + glossary. ChrF++ +1.90-22.41 over standalone MT.
- **RWS Language Weaver**: Production MT → MTQE → LLM refine loop (3 iterations).
- **Amazon/SAP (2019-2020)**: Placeholder/append terminology injection into NMT training.
- **NovelTrans/SJTU (WMT24)**: Terminology table + multi-model merge + post-correction for literary MT.
- **PiPeNovel (2018)**: NMT post-edit increases literary translation productivity by 36%.
- **CREAMT (2025)**: Fine-tuned Mistral-7B for literary post-edit achieves near-human creativity.

## Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Pivot EN quality (translated Chinese, not native EN) | Medium | Xianxia EN is mostly translated from ZH anyway |
| Placeholder creates awkward sentences | Medium | Amazon "append" approach as fallback |
| LLM over-edits meaning | Low | Strict prompt + provide EN source for reference |
| Kaggle session timeout during training | Low | Checkpoint every epoch, resume |
| 500k insufficient for 32k vocab | Low | HachimiMT works with 350k + 24k vocab |

## Unresolved Questions

None — all questions resolved during brainstorm.
