# ML Pipeline — How To Run

## Phase 1: Data Pivot (ZH→EN, ~4-6h, ~$3.50)

**Khuyến nghị: chạy trên Kaggle** (session 12h ổn định, không cần giữ máy bật).

---

### Option A — Chạy trên Kaggle (khuyến nghị)

#### Bước 1 — Thêm GEMINI_API_KEY vào Kaggle Secrets

Vào https://www.kaggle.com/settings → **API** → **Add secret**:
- Key: `GEMINI_API_KEY` — Value: Gemini API key của bạn

#### Bước 2 — Kiểm tra dataset đã ready

```bash
kaggle datasets list --mine
# Chờ cột size > 0 cho minhthang6789/en-vi-novel-mt-raw (~1.5GB)
```

#### Bước 3 — Re-push kernel với dataset đã attach

```bash
cd "/media/monet/SSD Web/CodeBase/AI-NOVEL-TRANS"
kaggle kernels push -p ml/kaggle/phase1-pivot
```

#### Bước 4 — Theo dõi và lấy output

```bash
# Xem status
kaggle kernels status minhthang6789/phase1-pivot-zh-to-en-en-vi-novel-mt

# Xem log (khi đang chạy)
kaggle kernels output minhthang6789/phase1-pivot-zh-to-en-en-vi-novel-mt

# Download output sau khi xong
kaggle kernels output minhthang6789/phase1-pivot-zh-to-en-en-vi-novel-mt \
  -p ml/data/pivot/
```

Output: `ml/data/pivot/pivot_output.jsonl` (~347k rows), `skipped.jsonl` (nếu có).

---

### Option B — Chạy local

#### Prerequisites

```bash
# HF login (chỉ cần làm 1 lần)
hf auth login --token "$HF_TOKEN"

# Kiểm tra GEMINI_API_KEY đã set
echo $GEMINI_API_KEY | head -c 10
```

#### Chạy full pivot

```bash
cd "/media/monet/SSD Web/CodeBase/AI-NOVEL-TRANS"

GEMINI_API_KEY="$GEMINI_API_KEY" ml/.venv/bin/python3 -m ml.data.pivot_zh_en \
  --input ml/data/raw/tran_vi_teacher_strict_clean_dedup_source.jsonl \
  --out-dir ml/data/pivot \
  --concurrency 30
```

Checkpoint tự động mỗi 5k rows → nếu bị ngắt, chạy lại **cùng lệnh** để resume.

Để chạy nền:

```bash
nohup GEMINI_API_KEY="$GEMINI_API_KEY" ml/.venv/bin/python3 -m ml.data.pivot_zh_en \
  --input ml/data/raw/tran_vi_teacher_strict_clean_dedup_source.jsonl \
  --out-dir ml/data/pivot \
  --concurrency 30 \
  > ml/data/pivot.log 2>&1 &

tail -f ml/data/pivot.log
```

---

## Phase 1: Sau khi pivot xong

### Bước 1 — Validate output

```bash
cd "/media/monet/SSD Web/CodeBase/AI-NOVEL-TRANS"

# Đếm rows
wc -l ml/data/pivot/pivot_output.jsonl

# Kiểm tra skipped (nếu có)
wc -l ml/data/pivot/skipped.jsonl 2>/dev/null || echo "No skipped rows"
```

### Bước 2 — Train/val split (95/5)

```bash
ml/.venv/bin/python3 -m ml.data.split_train_val \
  --input ml/data/pivot/pivot_output.jsonl \
  --out-dir ml/data/split
```

Output: `ml/data/split/train.en`, `train.vi`, `val.en`, `val.vi`

### Bước 3 — Verify line counts khớp

```bash
wc -l ml/data/split/train.en ml/data/split/train.vi
wc -l ml/data/split/val.en ml/data/split/val.vi
```

---

## Phase 2: Fine-tune trên Kaggle (sau khi có split data)

### Chuẩn bị — upload data lên Kaggle

```bash
cd "/media/monet/SSD Web/CodeBase/AI-NOVEL-TRANS"

# Tạo Kaggle dataset từ split data
kaggle datasets init -p ml/data/split
# Sửa ml/data/split/dataset-metadata.json: đặt title + id phù hợp, ví dụ:
#   "id": "yourusername/en-vi-novel-split"

# Upload
kaggle datasets create -p ml/data/split
```

### Chuẩn bị — Kaggle Secrets

Vào https://www.kaggle.com/settings → **API** → **Add secret**:
- Key: `HF_TOKEN` — Value: HuggingFace token của bạn

### Chạy training notebook

1. Tạo notebook mới trên Kaggle, chọn **T4 GPU**
2. Add dataset vừa upload vào notebook
3. Copy nội dung `ml/train/finetune_opus_mt.py` vào notebook cell
4. Chạy — training ~2-3h, checkpoint mỗi epoch + mỗi 500 steps

Hoặc dùng Kaggle CLI để push notebook:

```bash
# Tạo notebook metadata
kaggle kernels init -p ml/train

# Sửa ml/train/kernel-metadata.json:
#   "language": "python"
#   "kernel_type": "script"
#   "enable_gpu": true
#   "dataset_sources": ["yourusername/en-vi-novel-split"]

# Push và chạy
kaggle kernels push -p ml/train
kaggle kernels status yourusername/finetune-opus-mt-en-vi
```

### Theo dõi và lấy output

```bash
# Xem log training
kaggle kernels output yourusername/finetune-opus-mt-en-vi

# Sau khi xong, download model
kaggle kernels output yourusername/finetune-opus-mt-en-vi -p ml/models/
```

### Kiểm tra BLEU

```bash
ml/.venv/bin/python3 -m ml.train.evaluate \
  --model ml/models/opus-mt-en-vi-finetuned \
  --val-en ml/data/split/val.en \
  --val-vi ml/data/split/val.vi
```

Target: **BLEU ≥ 30**. Nếu dưới ngưỡng → thử lại với `lr=3e-5` và tăng lên 8 epochs.

---

> Xem chi tiết: `plans/260529-2312-en-vi-offline-mt-pipeline/phase-02-model-training.md`
