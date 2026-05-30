# Brainstorm: Xây dựng Model Dịch Tiểu Thuyết EN→VI

> **Ngày:** 2026-05-29  
> **Mục tiêu:** Model dịch tiểu thuyết kiếm hiệp / tiên hiệp / phép thuật từ Tiếng Anh → Tiếng Việt,  
> chạy **offline**, **fluency cao**, **không tốn phí vận hành**.

---

## 1. Tham chiếu: ngocdang83/HachimiMT-60-zh-vi

Model gốc muốn replicating:

| Thuộc tính | Giá trị |
|---|---|
| Kiến trúc | `MarianMTModel` — 57M params |
| Encoder | 8 layers, 8 attention heads |
| Decoder | 2 layers (asymmetric — encoder mạnh hơn) |
| Tokenizer | SentencePiece BPE, vocab 24k |
| Dataset | 350k cặp ZH→VI (Gemini distilled) + hirashiba filtered |
| Offline runtime | CTranslate2 INT8 — ~60 tok/s trên CPU |
| Demo | HuggingFace Space (Gradio, miễn phí) |

**Kết luận:** Kiến trúc nhỏ gọn, chạy được trên CPU, chất lượng tốt cho domain tiểu thuyết.

---

## 2. Mục tiêu

- **Ngôn ngữ:** EN → VI (tiếng Anh → tiếng Việt)
- **Domain:** Tiểu thuyết xianxia, wuxia, phép thuật, LitRPG
- **Ưu tiên:** Fluency (đọc tự nhiên) hơn faithfulness (sát từng chữ)
- **Vận hành:** Offline hoàn toàn sau khi train
- **Ngân sách API:** Có sẵn Gemini API key
- **Train môi trường:** Kaggle Notebook (miễn phí GPU)

---

## 3. Vấn đề dữ liệu

### Tình trạng thị trường EN→VI trên HuggingFace

| Dataset | Loại | Phù hợp? |
|---|---|---|
| `chi-vi/hirashiba-mt-zh2vi-b-filtered` | ZH→VI, 10M+ dòng | ❌ Trực tiếp — nhưng dùng được gián tiếp |
| `ngocdang83/tran-vi-teacher` | ZH→VI, 350k Gemini distilled | ❌ Trực tiếp |
| `pranjali97/raw_vi_ko_en_parallel_corpus` | VI/KR/EN, ~10k | ❓ Không rõ chất lượng |
| EN→VI novel domain | — | **Chưa tồn tại trên HF** |

**Kết luận:** Không có sẵn EN→VI dataset chất lượng cho domain tiểu thuyết.

---

## 4. Giải pháp: Pivot Translation

### Ý tưởng

```
hirashiba ZH→VI dataset:
  source_zh: "他必须得抓紧时间了..."
  target_vi: "Hắn phải tranh thủ thời gian..."

        ↓ Dùng Gemini dịch ZH → EN

Dataset EN→VI cuối:
  source_en: "He had to hurry..."        ← Gemini tạo ra
  target_vi: "Hắn phải tranh thủ..."    ← Giữ nguyên, chất lượng cao
```

### Tại sao hợp lệ?

- ZH và EN đều là bản dịch của **cùng 1 nguồn gốc** → tương đương ngữ nghĩa
- VI target **giữ nguyên** từ parallel corpus chất lượng cao → không cần tạo lại
- Domain xianxia/wuxia bằng EN **phần lớn là dịch từ ZH** → style khớp với use case thực tế

### Nhược điểm

- EN là "English dịch từ Trung" — không phải English native
- Không lý tưởng cho western fantasy gốc EN (Harry Potter, LOTR...)
- Với xianxia/wuxia domain: **không thành vấn đề**

---

## 5. Pipeline đầy đủ

```
Bước 1: FILTER
  Input:  chi-vi/hirashiba-mt-zh2vi-b-filtered (10M+ dòng ZH→VI)
  Filter: length ratio, có dấu VI, có chữ Hán, dedup hash
  Output: ~500k cặp sạch ZH→VI
  Môi trường: Kaggle CPU, streaming (không cần nhiều RAM)
  Thời gian: 2–3h

Bước 2: PIVOT (Gemini)
  Input:  500k ZH source từ bước 1
  Action: Gemini 2.5 Flash-Lite dịch ZH → EN (concurrent, retry, resume)
  Output: 500k cặp EN→VI ← Dataset cuối để train
  Thời gian: 4–8h
  Chi phí: ~$3

Bước 3: TRAIN (Kaggle GPU)
  Input:  500k cặp EN→VI
  Model:  MarianMT 57M (asymmetric 8enc + 2dec, d_model 512)
  Tokenizer: SentencePiece BPE vocab 32k (EN+VI joint)
  Kaggle: P100 GPU, 30h/tuần free
  Output: Checkpoint PyTorch
  Thời gian: 8–12h

Bước 4: EXPORT (CTranslate2)
  Input:  Checkpoint PyTorch
  Action: Convert → INT8 quantization
  Output: ct2-int8_float32/ → chạy offline ~60 tok/s CPU
  Thời gian: 30 phút

Bước 5: DEPLOY
  Upload lên HuggingFace Hub (miễn phí)
  Tạo HF Space với Gradio (miễn phí)
  Tích hợp vào AI-NOVEL-TRANS web app (FastAPI backend)
```

---

## 6. Chi phí & Thời gian

| Bước | Môi trường | Thời gian | Chi phí |
|---|---|---|---|
| Filter 10M dòng | Kaggle CPU | 2–3h | $0 |
| Pivot 500k qua Gemini | Kaggle CPU / Local | 4–8h | ~$3 |
| Train MarianMT 57M | Kaggle P100 GPU | 8–12h | $0 |
| Export CTranslate2 | Kaggle CPU | 30 phút | $0 |
| Upload + deploy HF | — | 1h | $0 |
| **TỔNG** | | **~1.5–2 ngày** | **~$3** |

---

## 7. Các quyết định đã chốt

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Ngôn ngữ | EN→VI | Ưu tiên, domain xianxia/wuxia EN phong phú |
| KR→VI | Sau | Chưa có data sẵn |
| Source dataset | hirashiba-mt-zh2vi-b-filtered | 10M dòng, đã filter 1 lần, miễn phí |
| Tạo EN source | Pivot via Gemini | Rẻ ~$3, không cần scrape |
| Architecture | MarianMT 57M (8enc + 2dec) | Đã proven bởi HachimiMT |
| Tokenizer | SentencePiece BPE 32k | Joint EN+VI |
| Train env | Kaggle Notebook Free | 30h GPU/tuần, P100 16GB |
| Offline runtime | CTranslate2 INT8 | ~60 tok/s CPU |
| Demo | HuggingFace Space (Gradio) | Miễn phí |

---

## 8. Mở rộng sau

### KR→VI

- Vấn đề: Chưa có KR→VI novel dataset trên HF
- Giải pháp: Scrape raw KR novel (munpia, novelpia) → Gemini KR→VI distill thẳng
- Chi phí ước tính: ~$5–10 Gemini + $0 train

### Cải thiện EN→VI

- Thêm RoyalRoad / WebNovel EN xianxia scrape → Gemini distill EN→VI thẳng
- Merge vào dataset → fine-tune thêm
- Glossary injection cho tên riêng nhân vật/địa danh

---

## 9. Câu hỏi còn mở

- [ ] Chạy pivot Gemini ở đâu? Local hay Kaggle CPU?
- [ ] Xử lý tên riêng như thế nào khi pivot ZH→EN? (giữ nguyên tên Trung hay dịch?)
- [ ] Tích hợp model vào AI-NOVEL-TRANS: FastAPI backend hay transformers.js trong browser?
- [ ] Có cần thêm western fantasy data (LOTR-style EN) không, hay chỉ xianxia là đủ?

---

## 10. Bước tiếp theo (khi sẵn sàng code)

1. **filter_hirashiba.py** — stream + filter 10M → 500k, lưu `.jsonl`
2. **pivot_gemini.py** — concurrent Gemini calls, retry, resume từ checkpoint
3. **train_marian_en_vi.ipynb** — Kaggle Notebook đầy đủ (tokenizer + train + eval)
4. **export_ct2.py** — convert PyTorch → CTranslate2 INT8
5. **hf_space_app.py** — Gradio demo upload lên HF Space
