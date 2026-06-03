# ML Pipeline — How To Run

## Phase 1: Data Pivot (ZH→EN, ~4-6h, ~$3.50)

**Khuyến nghị: chạy trên Kaggle** (session 12h ổn định, không cần giữ máy bật).

---

### Option A — Chạy trên Kaggle (khuyến nghị)

#### Bước 1 — Dán GEMINI_API_KEY vào private Kaggle notebook

Kaggle Secrets bị lỗi `HTTP Error 400` trong runtime này, nên Phase 1 dùng workaround private notebook:

1. Mở https://www.kaggle.com/code/minhthang6789/phase-1-pivot-zh-to-en-en-vi-novel-mt
2. Click **Edit** và refresh để lấy kernel version mới nhất
3. Tìm dòng:

```python
DIRECT_GEMINI_API_KEY = ""
```

4. Chỉ thay chuỗi rỗng bằng key thật:

```python
DIRECT_GEMINI_API_KEY = "API_KEY_THẬT_CỦA_BẠN"
```

5. Không sửa block guard phía dưới:

```python
if not DIRECT_GEMINI_API_KEY.strip():
    raise RuntimeError(
        "Paste your real Gemini API key into DIRECT_GEMINI_API_KEY before running."
    )
```

Sau khi pivot xong, rotate/revoke key nếu key từng xuất hiện trong screenshot/chat. Không commit key thật vào git.

#### Bước 2 — Attach Kaggle dataset vào notebook Input

Kaggle CLI có thể thấy dataset, nhưng notebook runtime chỉ đọc được khi dataset đã được **Add Input**.

1. Trong notebook editor, bấm **Add Input**
2. Add dataset: `minhthang6789/en-vi-novel-mt-raw`
3. Path đúng sau khi attach là:

```text
/kaggle/input/datasets/minhthang6789/en-vi-novel-mt-raw/tran_vi_teacher_strict_clean_dedup_source.jsonl
```

Runner hiện tại tự dò file bằng `Path("/kaggle/input").glob("**/tran_vi_teacher_strict_clean_dedup_source.jsonl")`, nên không phụ thuộc cố định vào một mount path. Log đúng sẽ có dạng:

```text
Using dataset file: /kaggle/input/datasets/minhthang6789/en-vi-novel-mt-raw/tran_vi_teacher_strict_clean_dedup_source.jsonl
```

#### Bước 3 — Ghi nhớ các lỗi Kaggle đã gặp

- `UserSecretsClient().get_secret(...)` lỗi `HTTP Error 400`: lỗi Kaggle Secrets runtime, không phải lỗi Gemini key.
- `ModuleNotFoundError: No module named 'pivot_zh_en'`: Kaggle script kernel không đảm bảo thấy sibling file; runner cần self-contained hoặc package rõ ràng.
- `NameError: subprocess is not defined`: khi sinh runner self-contained phải kiểm tra đủ import bằng `python3 -m py_compile` trước khi push.
- `FileNotFoundError` dưới `/kaggle/input/en-vi-novel-mt-raw/...`: dataset chưa attach vào notebook hoặc mount path khác; dùng recursive discovery và in `Available inputs`.

#### Bước 4 — Theo dõi và lấy output

```bash
# Xem status
kaggle kernels status minhthang6789/phase-1-pivot-zh-to-en-en-vi-novel-mt

# Xem log (khi đang chạy)
kaggle kernels output minhthang6789/phase-1-pivot-zh-to-en-en-vi-novel-mt

# Download output sau khi xong
kaggle kernels output minhthang6789/phase-1-pivot-zh-to-en-en-vi-novel-mt \
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

### Troubleshooting — Transformers/Colab

Nếu Colab báo:

```text
TypeError: Seq2SeqTrainer.__init__() got an unexpected keyword argument 'tokenizer'
```

Nguyên nhân: phiên bản `transformers` mới không còn nhận `tokenizer=` trong `Seq2SeqTrainer(...)`.

Fix tối thiểu trong `ml/train/finetune_opus_mt.py`:

```diff
-        tokenizer=tokenizer,
+        processing_class=tokenizer,
```

Không đổi `DataCollatorForSeq2Seq(tokenizer=tokenizer, ...)` vì tham số đó vẫn hợp lệ. Sau khi upload file đã sửa lên Colab Drive, chạy lại cell setup để copy code từ Drive sang runtime rồi mới chạy lại training.

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

### Colab flow đã xác thực (2026-06-03)

1. Mount Drive + kiểm tra GPU.
2. Chạy cell setup để:
   - tạo `RUNTIME_ROOT=/content/ai-novel-trans-runtime`
   - copy code từ Drive vào runtime
   - compile check `seq2seq_pipeline.py`, `finetune_opus_mt.py`, `evaluate.py`
   - tự cài các package còn thiếu: `transformers`, `datasets`, `sacrebleu`, `sacremoses`, `sentencepiece`
3. Chạy cell training với:
   - `--output-dir /content/drive/MyDrive/ai-novel-trans-phase2/checkpoints/opus-mt-en-vi-finetuned`
   - `--epochs 1`
   - `--batch-size 16`
   - `--eval-samples 128`
   - `--resume-from-checkpoint auto`
4. Kết quả run đã xác nhận:
   - training hoàn tất 1 epoch
   - log epoch-end: `eval_bleu=34.29`, `eval_chrf=54.54`, `train_loss=1.959`
   - quick eval `ml.train.evaluate --limit 256`: `BLEU=33.29`, `ChrF++=54.13`, `exit code=0`
5. Artifacts đã có trên Drive:
   - model dùng cho inference/eval: `checkpoints/opus-mt-en-vi-finetuned/`
   - resume checkpoint: `checkpoints/opus-mt-en-vi-finetuned/checkpoint-20511/`

### Ghi chú vận hành Colab

- Nếu Colab thấy `code/` hoặc `data/` trống nhưng Google Drive web vẫn còn file, xử lý như lỗi stale mount: `drive.flush_and_unmount()`, xoá mountpoint local `/content/drive`, rồi `drive.mount('/content/drive', force_remount=True)`.
- Sau khi mount Drive, luôn in danh sách file trong `code/` và `data/` để xác nhận runtime đang nhìn đúng workspace.
- Nếu runtime reconnect/reset, hãy chạy lại cell setup trước khi evaluate vì `RUNTIME_ROOT` là thư mục tạm dưới `/content`.
- Cell evaluate nên tự phục hồi runtime trước khi gọi `os.chdir(RUNTIME_ROOT)`: tạo lại package dưới `/content/ai-novel-trans-runtime`, copy code từ Drive, compile check, và cài package thiếu.
- Nếu evaluate báo thiếu `sacrebleu`, nguyên nhân là runtime chưa cài đủ package; cell setup mới đã tự kiểm tra và cài phần thiếu.
- Với `transformers` mới, `Seq2SeqTrainer(...)` phải dùng `processing_class=tokenizer`, không dùng `tokenizer=tokenizer`.

### Bước tiếp theo khuyến nghị

1. Chạy full evaluation trên toàn bộ `val.en` / `val.vi` để lấy BLEU chính thức cho Phase 2.
2. Nếu BLEU full-val vẫn ≥ 30, chốt artifact directory và thêm cell inference/demo cố định.
3. Nếu cần phân phối model ngoài Colab/Drive, push model cuối lên Hugging Face private repo.

---

> Xem chi tiết: `plans/260529-2312-en-vi-offline-mt-pipeline/phase-02-model-training.md`
