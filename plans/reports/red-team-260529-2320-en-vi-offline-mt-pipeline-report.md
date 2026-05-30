# Red-Team Review: EN-VI Offline MT Pipeline Plan

> **Date:** 2026-05-29  
> **Plan:** `plans/260529-2312-en-vi-offline-mt-pipeline/`  
> **Mode:** --hard

## Findings

### CRITICAL

| # | Issue | Resolution |
|---|-------|-----------|
| C1 | FastAPI server = UX regression for browser-only SPA | **Accepted risk** — target user is developer/translator running local. HF Spaces demo covers no-install use case. |
| C2 | Pivot data misalignment (ZH→EN + ZH→VI are independent) | **Not a real issue** — both EN and VI derive from same ZH source sentence. Semantically aligned via ZH anchor. HachimiMT validated this approach. |
| C3 | No gold-standard eval data for BLEU measurement | **Fixed** — added test set curation step to Phase 1 (100-200 manually verified xianxia EN→VI pairs). |

### HIGH

| # | Issue | Resolution |
|---|-------|-----------|
| H1 | Training 57M from scratch on 500k may be insufficient | **Fixed** — switched to fine-tuning Helsinki-NLP/opus-mt-en-vi (pretrained EN→VI). Reduces training time (4-8h vs 12h), improves quality baseline, less data-hungry. |

### MEDIUM

| # | Issue | Resolution |
|---|-------|-----------|
| M1 | Placeholder tokens may not survive BPE + inference | Mitigated: tokens added as special_tokens (not BPE-split). Preservation rate tracked as metric. Fallback: Amazon "append" approach. |
| M2 | Hybrid mode needs LLM API key but server runs separately from browser | Clarified: hybrid mode polish happens client-side (browser calls LLM directly after receiving MT output from server). No key sharing needed. |

## Rejected Recommendations

| Suggestion | Reason |
|-----------|--------|
| ONNX Runtime Web for in-browser inference | MarianMT 74M too slow in browser WASM. CT2 on local CPU is 10-50x faster. Explore post-v1. |

## Plan Changes Applied

1. Phase 2: Fine-tune opus-mt-en-vi instead of training from scratch
2. Phase 1: Added gold-standard test set curation (100-200 pairs)
3. Phase 3: Updated conversion paths for fine-tuned model
4. BLEU target raised from ≥25 to ≥30 (pretrained baseline gives head start)
