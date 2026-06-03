---
title: Phase 2 Fine-Tuning TDD Test Checklist
date: 2026-06-01 09:00 UTC
status: DONE
phase: phase-02-model-training
---

# Phase 2 Fine-Tuning TDD Test Checklist

## Summary

Propose **11 minimal, high-value unit tests** for `ml/train/finetune_opus_mt.py` and `ml/train/evaluate.py`. Keep integration/e2e out of scope (those require Kaggle GPU). Focus on:
- **Data loading pipeline** (input validation, file parsing)
- **Metric computation** (BLEU, ChrF++)
- **Model checkpoint logic** (state handling, early stopping)
- Mock HuggingFace transformers; real file I/O for data paths

---

## Architecture Insights

From phase-02 spec and test_split_train_val.py pattern:

1. **Input contract:** Train/val are parallel `.en` / `.vi` files, one segment per line
2. **Validation strategy:** Test _input validation and normalization_, not the GPU training loop
3. **Output contract:** Checkpoints saved in HuggingFace format; metrics logged after each epoch
4. **Test patterns to follow:** Use pytest fixtures + real tmp_path for file I/O (no mocking filesystem)

---

## Proposed Test Structure

### File: `ml/train/test_finetune_opus_mt.py`

**Unit tests only — no GPU, no actual model download.**

#### Test 1: Load training data from split files
```python
def test_load_train_data_from_split_files(tmp_path):
    """Load EN/VI pairs from train.en / train.vi"""
    en_file = tmp_path / "train.en"
    vi_file = tmp_path / "train.vi"
    en_file.write_text("Hello world\nGoodbye\n", encoding="utf-8")
    vi_file.write_text("Xin chào thế giới\nTạm biệt\n", encoding="utf-8")
    
    data = load_train_data(en_file, vi_file)
    
    assert len(data) == 2
    assert data[0]["en"] == "Hello world"
    assert data[0]["vi"] == "Xin chào thế giới"
```

**Scope:**
- Read parallel files
- Parse line-by-line
- Return list of EN/VI dicts

**Mock:** None. Real file I/O.

---

#### Test 2: Reject mismatched line counts
```python
def test_load_train_data_rejects_mismatched_counts():
    """If train.en has N lines, train.vi must also have N lines."""
    en_file = tmp_path / "train.en"
    vi_file = tmp_path / "train.vi"
    en_file.write_text("A\nB\nC\n", encoding="utf-8")
    vi_file.write_text("X\nY\n", encoding="utf-8")
    
    with pytest.raises(ValueError, match="line count"):
        load_train_data(en_file, vi_file)
```

**Scope:** Early validation. Prevent silent data corruption.

**Mock:** None.

---

#### Test 3: Normalize whitespace in input lines
```python
def test_load_train_data_normalizes_whitespace():
    """Collapse leading/trailing whitespace; fail if internal newlines present."""
    en_file = tmp_path / "train.en"
    vi_file = tmp_path / "train.vi"
    en_file.write_text("  Hello   world  \nGoodbye\n", encoding="utf-8")
    vi_file.write_text(" Xin chào \nTạm biệt\n", encoding="utf-8")
    
    data = load_train_data(en_file, vi_file)
    
    assert data[0]["en"] == "Hello world"
    assert data[0]["vi"] == "Xin chào"
```

**Scope:** Ensure consistent preprocessing at load time.

**Mock:** None.

---

#### Test 4: Validate file paths exist
```python
def test_load_train_data_raises_on_missing_files(tmp_path):
    """Raise FileNotFoundError if train.en or train.vi missing."""
    en_file = tmp_path / "missing.en"
    vi_file = tmp_path / "train.vi"
    
    with pytest.raises(FileNotFoundError):
        load_train_data(en_file, vi_file)
```

**Scope:** Fail fast. Clear error message.

**Mock:** None.

---

#### Test 5: Mock model loading with fake HuggingFace loader
```python
@patch("ml.train.finetune_opus_mt.AutoTokenizer.from_pretrained")
@patch("ml.train.finetune_opus_mt.AutoModelForSeq2SeqLM.from_pretrained")
def test_load_pretrained_model(mock_model, mock_tokenizer):
    """Load pretrained Helsinki-NLP/opus-mt-en-vi model and tokenizer."""
    mock_tokenizer.return_value = MagicMock(vocab_size=60000)
    mock_model.return_value = MagicMock(config=MagicMock(d_model=512))
    
    model, tokenizer = load_pretrained_model("Helsinki-NLP/opus-mt-en-vi")
    
    mock_tokenizer.assert_called_once_with("Helsinki-NLP/opus-mt-en-vi")
    mock_model.assert_called_once_with("Helsinki-NLP/opus-mt-en-vi")
    assert tokenizer.vocab_size == 60000
    assert model.config.d_model == 512
```

**Scope:**
- Verify correct model name passed
- Assert tokenizer unchanged (~60k vocab)
- Confirm model architecture

**Mock:** HuggingFace AutoTokenizer and AutoModelForSeq2SeqLM.

---

#### Test 6: Reject invalid model checkpoint name
```python
@patch("ml.train.finetune_opus_mt.AutoModelForSeq2SeqLM.from_pretrained")
def test_load_pretrained_model_raises_on_invalid_model(mock_model):
    """Raise error on invalid model identifier."""
    mock_model.side_effect = Exception("Model not found")
    
    with pytest.raises(Exception, match="Model not found"):
        load_pretrained_model("invalid/model/name")
```

**Scope:** Defensive programming. Fail fast on typos.

**Mock:** HuggingFace loader.

---

### File: `ml/train/test_evaluate.py`

**Unit tests only — no actual model inference.**

#### Test 7: Compute BLEU score (mock sacrebleu)
```python
@patch("ml.train.evaluate.sentence_bleu")
def test_compute_bleu_score(mock_bleu):
    """Compute BLEU score on val set."""
    mock_bleu.return_value = 32.5
    
    predictions = ["The cat is on the mat"]
    references = [["Mèo nằm trên thảm"]]
    
    score = compute_bleu_score(predictions, references)
    
    assert score == 32.5
    mock_bleu.assert_called_once()
```

**Scope:**
- Verify BLEU computation is called
- Return numeric score
- Handle list of predictions vs references

**Mock:** sacrebleu.sentence_bleu().

---

#### Test 8: Compute ChrF++ score (mock chrF++)
```python
@patch("ml.train.evaluate.CHRF.score")
def test_compute_chrf_score(mock_chrf):
    """Compute ChrF++ score on val set."""
    mock_chrf.return_value = MagicMock(score=28.3)
    
    predictions = ["The cat is on the mat"]
    references = ["Mèo nằm trên thảm"]
    
    score = compute_chrf_score(predictions, references)
    
    assert score == 28.3
    mock_chrf.assert_called_once()
```

**Scope:**
- Verify ChrF++ API usage
- Return numeric score
- Differentiate from BLEU

**Mock:** sacrebleu CHRF.

---

#### Test 9: Load validation data and compute metrics
```python
def test_evaluate_on_val_set(tmp_path):
    """Load val.en / val.vi and compute both metrics."""
    en_file = tmp_path / "val.en"
    vi_file = tmp_path / "val.vi"
    en_file.write_text("Hello world\nGoodbye friend\n", encoding="utf-8")
    vi_file.write_text("Xin chào\nTạm biệt bạn\n", encoding="utf-8")
    
    # Fake model that returns trivial translations
    mock_model = MagicMock()
    mock_tokenizer = MagicMock()
    
    metrics = evaluate_on_val_set(
        model=mock_model,
        tokenizer=mock_tokenizer,
        en_file=en_file,
        vi_file=vi_file,
    )
    
    assert "bleu" in metrics
    assert "chrf" in metrics
    assert isinstance(metrics["bleu"], float)
    assert isinstance(metrics["chrf"], float)
```

**Scope:**
- Load val files
- Call model for predictions (mocked)
- Return metrics dict with BLEU and ChrF++

**Mock:** Model and tokenizer (inference not tested).

---

#### Test 10: Reject if val files missing or mismatched
```python
def test_evaluate_rejects_missing_val_files():
    """Raise FileNotFoundError if val.en or val.vi missing."""
    with pytest.raises(FileNotFoundError):
        evaluate_on_val_set(mock_model, mock_tokenizer, "missing.en", "missing.vi")

def test_evaluate_rejects_mismatched_val_line_counts(tmp_path):
    """Raise ValueError if line counts don't match."""
    en_file = tmp_path / "val.en"
    vi_file = tmp_path / "val.vi"
    en_file.write_text("A\nB\n", encoding="utf-8")
    vi_file.write_text("X\n", encoding="utf-8")
    
    with pytest.raises(ValueError, match="line count"):
        evaluate_on_val_set(mock_model, mock_tokenizer, en_file, vi_file)
```

**Scope:** Same defensive logic as training data.

**Mock:** None for file validation; model mocked if inference tested.

---

#### Test 11: Early stopping logic
```python
def test_early_stopping_tracks_best_loss():
    """EarlyStopping stops after patience epochs without improvement."""
    stopper = EarlyStopping(patience=2, metric="val_loss")
    
    assert not stopper.should_stop(val_loss=10.0)  # 1st
    assert not stopper.should_stop(val_loss=9.5)   # 2nd (improvement)
    assert not stopper.should_stop(val_loss=9.6)   # 3rd (no improvement, count = 1)
    assert not stopper.should_stop(val_loss=9.7)   # 4th (no improvement, count = 2)
    assert stopper.should_stop(val_loss=9.8)       # 5th (patience exhausted)
    assert stopper.best_loss == 9.5
    assert stopper.best_epoch == 1
```

**Scope:**
- Track best metric (val_loss)
- Count consecutive epochs without improvement
- Return stop signal when patience exhausted
- Preserve best checkpoint metadata

**Mock:** None (pure state machine).

---

## Test Organization

```
ml/train/
├── __init__.py
├── finetune_opus_mt.py          ← to be created
├── evaluate.py                  ← to be created
├── requirements.txt             ← add transformers, sacrebleu, torch, datasets
└── tests/
    ├── __init__.py
    ├── test_finetune_opus_mt.py  ← 6 tests
    └── test_evaluate.py          ← 5 tests
```

---

## Mock vs Real

| Component | Mock? | Reason |
|-----------|-------|--------|
| File I/O (`.en` / `.vi` files) | **No** | Real file paths; tmp_path fixture isolates |
| HuggingFace model loading | **Yes** | Avoid downloading 74M param model in test CI |
| Model inference | **Yes** | GPU not available in test environment |
| sacrebleu BLEU/ChrF++ | **Yes** | Isolate metric logic; test real library only in e2e |
| DataLoader | **Partial** | Create fixture for small fake dataset; don't mock PyTorch |
| Optimizer (AdamW) | **Mock** | Verify it's called; skip gradient steps |

---

## Acceptance Criteria

- ✅ All 11 tests pass on local machine (`pytest ml/train/tests/`)
- ✅ No HuggingFace model downloads during test (mocked)
- ✅ Real file I/O using pytest tmp_path (not mocked)
- ✅ Coverage ≥ 80% for both files
- ✅ Tests follow Phase 1 pattern: immutable Pair dataclass, single-line validation, fixture-driven setup

---

## Next Steps

1. **Create `ml/train/finetune_opus_mt.py`** with stubs:
   - `load_train_data(en_path, vi_path) → list[dict]`
   - `load_pretrained_model(model_id) → (model, tokenizer)`
   - `EarlyStopping` class with `should_stop()` method

2. **Create `ml/train/evaluate.py`** with stubs:
   - `compute_bleu_score(predictions, references) → float`
   - `compute_chrf_score(predictions, references) → float`
   - `evaluate_on_val_set(model, tokenizer, en_path, vi_path) → dict`

3. **Create `ml/train/tests/test_*.py`** and run:
   ```bash
   pytest ml/train/tests/ -v --cov=ml.train
   ```

4. **Implement red → green → refactor** for each test in order.

5. **Skip Kaggle GPU training** until all unit tests pass locally.

---

## Open Questions

- Should `finetune_opus_mt.py` accept a config file (YAML/JSON) for hyperparams, or hardcode them per phase spec?
  - **Recommendation:** Hardcode per phase spec (5e-5 lr, 16 batch, 3-5 epochs). Config file is YAGNI at this stage.

- Should `evaluate.py` support both sacrebleu CLI and library API?
  - **Recommendation:** Use library API only (easier to mock + no subprocess overhead).

- Should EarlyStopping be in `finetune_opus_mt.py` or a shared `ml/utils/early_stopping.py`?
  - **Recommendation:** Start inline in `finetune_opus_mt.py`; extract later if reused.
