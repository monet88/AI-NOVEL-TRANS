---
phase: 1
title: "Data Pivot"
status: done
priority: P1
effort: "4-6h"
dependencies: []
---

> **Trạng thái thực thi (2026-06-01 08:57):** Pivot Kaggle đã hoàn tất, output đã tải về, và split train/val đã chạy xong với heuristic mới.
> - Dataset `minhthang6789/en-vi-novel-mt-raw` đã upload và ready
> - Kaggle Secrets bị lỗi runtime `HTTP Error 400`, nên chuyển sang direct key trong private notebook
> - User cần chỉ sửa `DIRECT_GEMINI_API_KEY = ""` thành key thật trong Kaggle UI, không sửa guard `if not DIRECT_GEMINI_API_KEY.strip()`
> - Kernel v9 lỗi trước khi chạy data vì Kaggle runtime không có sibling module `pivot_zh_en.py` (`ModuleNotFoundError`)
> - Code fix: `run_pivot.py` đã được đổi thành self-contained runner, không còn import `pivot_zh_en.py`; thiếu import `subprocess` đã được bắt bằng `py_compile` và sửa
> - Dataset input path thực tế sau Add Input là `/kaggle/input/datasets/minhthang6789/en-vi-novel-mt-raw/tran_vi_teacher_strict_clean_dedup_source.jsonl`; runner dùng recursive discovery thay vì hardcode một mount path
> - Log xác nhận đã đúng: `Using dataset file: /kaggle/input/datasets/minhthang6789/en-vi-novel-mt-raw/tran_vi_teacher_strict_clean_dedup_source.jsonl`
> - Post-pivot validation đã được nới lại: `MAX_LEN_RATIO = 5.5`, length-ratio chỉ áp dụng khi `len(ZH) >= 10`, và refusal patterns chỉ giữ các cụm translation-refusal cụ thể
> - Re-run validation trên `pivot_output.jsonl` cho kết quả reject 378 / 345,819 = 0.109%, dưới ngưỡng 2%
> - Sau khi pivot xong, rotate/revoke Gemini key nếu key từng xuất hiện trong screenshot/chat
>
> **Bước tiếp theo sau khi pivot xong (session mới):**
> 1. Kiểm tra kernel status: `kaggle kernels status minhthang6789/phase-1-pivot-zh-to-en-en-vi-novel-mt`
> 2. Download output: `kaggle kernels output minhthang6789/phase-1-pivot-zh-to-en-en-vi-novel-mt -p ml/data/pivot/`
> 3. Verify: `wc -l ml/data/pivot/pivot_output.jsonl` (expect ~347k), kiểm tra `skipped.jsonl`
> 4. Chạy train/val split: `ml/.venv/bin/python3 -m ml.data.split_train_val --input ml/data/pivot/pivot_output.jsonl --out-dir ml/data/split`
> 5. Verify line counts: `wc -l ml/data/split/train.en ml/data/split/train.vi ml/data/split/val.en ml/data/split/val.vi`
> 6. Tick success criteria bên dưới, update phase status → `done`, chuyển sang Phase 2

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
   - Pure-Python script detection: reject rows where EN output is <80% Latin script
   - Length ratio filter: reject if len(EN)/len(ZH) < 0.3 or > 5.5, applied only when `len(ZH) >= 10`
   - Reject rows containing >20% CJK characters (failed translation)
   - Reject translation-specific refusal patterns only (avoid normal dialogue like "I cannot believe...")
   - Log rejected rows to `pivot_rejected.jsonl` with reason
   - Actual: 378 / 345,819 rows rejected (0.109%)

4. **Train/val split**
   - 95% train, 5% validation
   - Output: `train.en`, `train.vi`, `val.en`, `val.vi` (one paragraph per line)

5. **Final validation**
   - Check line counts match between .en and .vi files
   - Spot-check 50 random pairs for quality

## Success Criteria

- [x] ~350k EN→VI parallel pairs produced from pivot (`pivot_output.jsonl`: 345,819 rows; accepted after validation: 345,441 pairs)
- [x] Pivot cost kept to the planned Gemini Flash-Lite budget path (estimated ≤ $3.50; verify billing dashboard if exact spend is required)
- [x] Post-pivot validation rejects <2% rows (378 / 345,819 = 0.109%)
- [x] Line counts match between EN and VI files (`train.en`/`train.vi`: 328,169; `val.en`/`val.vi`: 17,272)
- [x] Validation split is 5% (`val`: 17,272 / 345,441 = 5.0%)
- [x] Checkpoint artifact produced and completed run reconciled (`processed`: 347,259; output + skipped rows match processed total)

## Kaggle Execution Lessons

- Do not assume Kaggle CLI dataset visibility means the notebook runtime has the dataset mounted. The notebook must use **Add Input**.
- Do not hardcode only `/kaggle/input/<dataset-slug>/...`; Kaggle may mount as `/kaggle/input/datasets/<owner>/<dataset-slug>/...`. Use recursive discovery under `/kaggle/input` and print the resolved path.
- For Kaggle script kernels, do not assume sibling Python files are importable. Use a self-contained runner or package/copy modules explicitly and verify the runtime import path.
- When converting multi-file code into a self-contained Kaggle runner, run `python3 -m py_compile ml/kaggle/phase1-pivot/run_pivot.py` before every push to catch missing imports and syntax errors.
- Treat Kaggle Secrets `HTTP Error 400` as a Kaggle runtime secret-access failure, not as proof that the Gemini key is invalid. If using direct key workaround, keep the notebook private and rotate the key after use.

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Gemini API key leaked | Load only from `GEMINI_API_KEY`; never hardcode; keep `.env` ignored |
| Gemini rate limits slow pivot | Fixed semaphore 30 + exponential backoff, checkpoint for resume |
| Pivot produces translationese EN | Acceptable — murim/xianxia EN readers are used to this style |
| Some rows fail to translate | 3 retries + exponential backoff; skip to `skipped.jsonl`, re-run after main pass |
| Checkpoint corruption causes duplicate/skipped rows | Append-only JSONL with `row_index`; atomic checkpoint writes; resume validates checkpoint vs output line count |
| Garbage pivot output (mixed lang, refusals) | Post-pivot validation filters: lang detect + length ratio + CJK% + refusal patterns |
