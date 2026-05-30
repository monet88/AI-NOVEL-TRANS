---
phase: 3
title: "Export + Deploy"
status: pending
priority: P1
effort: "30min"
dependencies: [2]
---

# Phase 3: Export + Deploy

## Overview

Convert fine-tuned model to CTranslate2 INT8 format. Validate quality preserved. Upload to HuggingFace Hub and deploy Gradio demo on HF Spaces.

## Requirements

- Functional: CTranslate2 INT8 model with BLEU degradation ≤ 1 point
- Functional: Model uploaded to HF Hub + Gradio demo live
- Non-functional: Inference ≥ 50 tok/s single-thread CPU

## Architecture

```
Fine-tuned opus-mt-en-vi (FP32)
  │
  ├─ [Step 1] ct2-opus-mt-converter → INT8
  │   Model size: ~80MB
  │
  ├─ [Step 2] Validate (BLEU diff ≤ 1)
  │
  ├─ [Step 3] Upload to HuggingFace Hub
  │
  └─ [Step 4] Deploy Gradio demo on HF Spaces
```

## Related Code Files

- Create: `ml/export/convert_to_ct2.py` — Conversion + benchmark script
- Create: `demo/app.py` — Gradio demo for HF Spaces
- Create: `demo/requirements.txt` — gradio, ctranslate2, sentencepiece

## Implementation Steps

1. **Convert to CTranslate2 INT8**
   ```bash
   ct2-opus-mt-converter --model_dir ./opus-mt-en-vi-finetuned \
     --output_dir ./ct2-en-vi \
     --quantization int8
   ```

2. **Validate quality**
   - Translate val set with CT2 model
   - Compare BLEU with FP32 model
   - Accept if degradation ≤ 1 BLEU point

3. **Benchmark speed**
   - Translate 1000 sentences, measure tokens/second
   - Target: ≥ 50 tok/s single-threaded

4. **Upload to HuggingFace Hub**
   - CT2 model files + tokenizer
   - Model card with training details

5. **Deploy Gradio demo** (`demo/app.py`)
   - Load CT2 model + SentencePiece tokenizer
   - Interface: text input → translated output + inference time
   - Deploy to HF Spaces (free CPU tier)

## Success Criteria

- [ ] Model converted to CTranslate2 INT8
- [ ] BLEU degradation ≤ 1 point vs FP32
- [ ] Inference ≥ 50 tok/s (single thread)
- [ ] Model on HuggingFace Hub
- [ ] Gradio demo live on HF Spaces

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| INT8 quality loss > 1 BLEU | Try INT8_FLOAT16 quantization |
| HF Spaces too slow | Greedy decoding (beam_size=1) for demo |
