---
phase: 1
title: "Data Pivot"
status: pending
priority: P1
effort: "4-6h"
dependencies: []
---

# Phase 1: Data Pivot

## Overview

Download richardadam/tran-vi-teacher-bucket (350k clean ZH→VI paragraph pairs, dedup version), pivot ZH→EN via Gemini Flash-Lite concurrently. No filtering needed — dataset is already clean.

Execution mode for this phase: Claude runs all CLI/script commands directly (download, pivot, validation, split). User only confirms before long-running/cost operations.

## Requirements

- Functional: Produce 347k EN→VI parallel paragraph pairs
- Non-functional: Total pivot cost ≤ $3.50, processing time ≤ 6h local

## Architecture

```
richardadam/tran-vi-teacher-bucket (350k ZH→VI, public, no gating)
  │
  ├─ [Step 1] Download dedup JSONL via hf sync (no filtering needed)
  │
  ├─ [Step 2] Pivot ZH→EN via Gemini Flash-Lite (concurrent)
  │   ~$3.50 for 350k paragraphs
  │
  ├─ [Step 3] Train/val split (95/5)
  │
  └─ Output: train.en, train.vi, val.en, val.vi
```

## Related Code Files

- Create: `ml/data/download_dataset.py` — Download from richardadam/tran-vi-teacher-bucket via hf CLI
- Create: `ml/data/pivot_zh_en.py` — Concurrent Gemini pivot script
- Create: `ml/data/split_train_val.py` — Train/val split utility
- Create: `ml/data/requirements.txt` — huggingface-hub, google-genai, tqdm, aiohttp

## Implementation Steps

1. **Download dataset**
   - `hf sync hf://buckets/richardadam/tran-vi-teacher-bucket ./ml/data/raw/ --include "tran_vi_teacher_strict_clean_dedup_source.jsonl"`
   - Verify ~350k rows, columns: `source_zh` (ZH), `target_vi` (VI), `meta` (dict)
   - Use dedup version to avoid duplicate source text bias
   - No filtering — dataset is already clean novel-domain paragraphs

2. **Build concurrent pivot script** (local, Gemini Flash-Lite)
   - Read ZH paragraphs from `source_zh` column
   - Load API key from `GEMINI_API_KEY` environment variable; fail fast with clear error if missing
   - Never hardcode keys; keep any local `.env` ignored by git
   - Concurrent translate ZH→EN using Gemini Flash-Lite (asyncio + semaphore)
   - Prompt: `"Translate this Chinese text to English. Keep character names in pinyin (e.g., Lín Dòng). Output only the translation."`
   - Concurrency: 30 parallel requests (fixed semaphore; 2000 RPM ÷ ~1s avg = safe at 30)
   - Retry policy: 3 retries with exponential backoff per row
   - Main output: append-only `pivot_output.jsonl` with `row_index`, `source_zh`, `target_vi`, `pivot_en`, `status`
   - Failed rows logged to `skipped.jsonl` (row index + error) for re-run
   - Checkpoint every 5k rows using atomic temp-file-then-rename (`checkpoint.json.tmp` → `checkpoint.json`)
   - On resume: validate checkpoint row index against `pivot_output.jsonl` line count, trim corrupt trailing partial line if needed, skip completed `row_index` values
   - Estimated: ~4-6h for 350k paragraphs, ~$3.50

3. **Validate pivot output**
   - Language detection (fasttext): reject rows where EN output is <80% Latin script
   - Length ratio filter: reject if len(EN)/len(ZH) < 0.3 or > 4.0
   - Reject rows containing >20% CJK characters (failed translation)
   - Reject refusal patterns ("I cannot", "I'm sorry", "As an AI")
   - Log rejected rows to `pivot_rejected.jsonl` with reason
   - Expected: <2% rejection rate on clean dataset

4. **Train/val split**
   - 95% train, 5% validation
   - Output: `train.en`, `train.vi`, `val.en`, `val.vi` (one paragraph per line)

5. **Final validation**
   - Check line counts match between .en and .vi files
   - Spot-check 50 random pairs for quality

## Success Criteria

- [ ] ~350k EN→VI parallel pairs produced from pivot
- [ ] Pivot cost ≤ $3.50
- [ ] Post-pivot validation rejects <2% rows
- [ ] Line counts match between EN and VI files
- [ ] Validation split is 5% (~17k pairs)
- [ ] Checkpoint/resume works (tested by interrupting and resuming)

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Gemini API key leaked | Load only from `GEMINI_API_KEY`; never hardcode; keep `.env` ignored |
| Gemini rate limits slow pivot | Fixed semaphore 30 + exponential backoff, checkpoint for resume |
| Pivot produces translationese EN | Acceptable — murim/xianxia EN readers are used to this style |
| Some rows fail to translate | 3 retries + exponential backoff; skip to `skipped.jsonl`, re-run after main pass |
| Checkpoint corruption causes duplicate/skipped rows | Append-only JSONL with `row_index`; atomic checkpoint writes; resume validates checkpoint vs output line count |
| Garbage pivot output (mixed lang, refusals) | Post-pivot validation filters: lang detect + length ratio + CJK% + refusal patterns |
