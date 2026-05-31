# ML Pipeline — EN→VI Offline MT

Offline EN→VI translation for the murim/võ hiệp + xianxia novel domain.
See `plans/260529-2312-en-vi-offline-mt-pipeline/` for the full plan.

## Phase 1 — Data Pivot (`ml/data/`)

Turns the public ZH→VI teacher dataset into an EN→VI parallel corpus by
pivoting the Chinese source through Gemini Flash-Lite.

```
richardadam/tran-vi-teacher-bucket (≈350k ZH→VI, deduped)
  → download_dataset.py   download + schema/row-count validation
  → pivot_zh_en.py        Gemini ZH→EN pivot (concurrent, resumable)
  → split_train_val.py    validate pivot output + 95/5 train/val split
  → ml/data/final/{train,val}.{en,vi}
```

### Setup

```bash
# From repo root, using the project venv:
.venv/bin/python -m pip install -r ml/data/requirements.txt

# Gemini key — load from env only, never hardcode. Keep .env gitignored.
export GEMINI_API_KEY=...
```

### Run

```bash
# 1. Download the deduped dataset (~350k rows)
.venv/bin/python -m ml.data.download_dataset \
    --out ml/data/raw/tran_vi_teacher_strict_clean_dedup_source.jsonl

# 2. Pivot ZH→EN (≈4-6h, ≈$3.50). Resumable — safe to interrupt + re-run.
#    Use --limit for a cheap smoke test first.
.venv/bin/python -m ml.data.pivot_zh_en \
    --input ml/data/raw/tran_vi_teacher_strict_clean_dedup_source.jsonl \
    --out-dir ml/data/pivot \
    --limit 50            # drop --limit for the full run

# 3. Validate + split into parallel text files
.venv/bin/python -m ml.data.split_train_val \
    --input ml/data/pivot/pivot_output.jsonl \
    --out-dir ml/data/final
```

### Outputs

| Path | Description |
|------|-------------|
| `ml/data/raw/*.jsonl` | Downloaded source dataset |
| `ml/data/pivot/pivot_output.jsonl` | Append-only EN-pivoted rows (`status: ok`) |
| `ml/data/pivot/skipped.jsonl` | Rows that failed all retries (re-runnable) |
| `ml/data/pivot/checkpoint.json` | Atomic progress checkpoint |
| `ml/data/final/{train,val}.{en,vi}` | Parallel corpus for Phase 2 fine-tune |
| `ml/data/final/pivot_rejected.jsonl` | Rows rejected by validation + reason |

All `ml/data/` artifacts are gitignored (large, regenerable).

### Resilience

- **Concurrency:** fixed semaphore (default 30), safe under the 2000 RPM tier.
- **Retries:** 3 attempts per row with exponential backoff + jitter; exhausted
  rows go to `skipped.jsonl`.
- **Resume:** re-running skips `row_index` values already marked `ok` in
  `pivot_output.jsonl`; a corrupt trailing line from an interrupted write is
  physically trimmed (atomic rewrite) before the run continues, and the
  downstream split step logs any corrupt line as `corrupt_json` instead of
  crashing.

### Tests

```bash
.venv/bin/python -m pytest ml/tests/ -q
```

Pure-logic tests (concurrency, retry, checkpoint/resume, validation, split) run
with no network or SDK — the Gemini call is injected.
