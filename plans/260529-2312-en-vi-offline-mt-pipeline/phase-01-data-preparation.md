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

Download ngocdang83/tran-vi-teacher (347k clean ZH→VI paragraph pairs), pivot ZH→EN via Gemini Flash-Lite concurrently. No filtering needed — dataset is already clean.

## Requirements

- Functional: Produce 347k EN→VI parallel paragraph pairs
- Non-functional: Total pivot cost ≤ $3.50, processing time ≤ 6h local

## Architecture

```
ngocdang83/tran-vi-teacher (347k ZH→VI, public, clean)
  │
  ├─ [Step 1] Download dataset (no filtering needed)
  │
  ├─ [Step 2] Pivot ZH→EN via Gemini Flash-Lite (concurrent)
  │   ~$3.50 for 347k paragraphs
  │
  ├─ [Step 3] Train/val split (95/5)
  │
  └─ Output: train.en, train.vi, val.en, val.vi
```

## Related Code Files

- Create: `ml/data/download_dataset.py` — Download ngocdang83/tran-vi-teacher
- Create: `ml/data/pivot_zh_en.py` — Concurrent Gemini pivot script
- Create: `ml/data/split_train_val.py` — Train/val split utility
- Create: `ml/data/requirements.txt` — datasets, google-genai, tqdm, aiohttp

## Implementation Steps

1. **Download dataset**
   - `datasets.load_dataset("ngocdang83/tran-vi-teacher")`
   - Verify 347k rows, columns: ZH source + VI translation
   - No filtering — dataset is already clean novel-domain paragraphs

2. **Build concurrent pivot script** (local, Gemini Flash-Lite)
   - Read ZH paragraphs from dataset
   - Concurrent translate ZH→EN using Gemini Flash-Lite (asyncio + semaphore)
   - Prompt: `"Translate this Chinese text to English. Keep character names in pinyin (e.g., Lín Dòng). Output only the translation."`
   - Concurrency: 10-20 parallel requests (respect rate limits)
   - Checkpoint every 5k rows for resume capability
   - Estimated: ~4-6h for 347k paragraphs, ~$3.50

3. **Train/val split**
   - 95% train, 5% validation
   - Output: `train.en`, `train.vi`, `val.en`, `val.vi` (one paragraph per line)

4. **Validate output**
   - Check line counts match between .en and .vi files
   - Spot-check 50 random pairs for quality

## Success Criteria

- [ ] 347k EN→VI parallel pairs produced from pivot
- [ ] Pivot cost ≤ $3.50
- [ ] Line counts match between EN and VI files
- [ ] Validation split is 5% (~17k pairs)
- [ ] Checkpoint/resume works (tested by interrupting and resuming)

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Gemini rate limits slow pivot | Concurrent with semaphore + exponential backoff, checkpoint for resume |
| Pivot produces translationese EN | Acceptable — murim/xianxia EN readers are used to this style |
| Some rows fail to translate | Skip failed rows, log them, retry at end |
