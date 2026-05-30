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

Execution mode for this phase: Claude runs conversion, benchmark, and Hugging Face CLI publish commands directly.

## Requirements

- Functional: CTranslate2 INT8 model with BLEU degradation ≤ 1 point
- Functional: Model uploaded to HF Hub + Gradio demo live
- Non-functional: Inference ≥ 50 tok/s single-thread CPU

## Architecture

```
Fine-tuned opus-mt-en-vi (FP32)
  │
  ├─ [Step 1] ct2-transformers-converter --model_type marian → INT8
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
   - Fine-tuned model is saved in HuggingFace MarianMT format, so use the generic Transformers converter as primary path.
   ```bash
   ct2-transformers-converter --model_type marian \
     --model_name_or_path ./opus-mt-en-vi-finetuned \
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
   - Load write token from `HF_TOKEN` environment variable; never hardcode token in script
   - Push to **private** model repo first for internal validation
   - Switch visibility to public only after Phase 6 quality gate passes (BLEU ≥ 30 + full val benchmark)
   - Model card with training details

5. **Deploy Gradio demo** (`demo/app.py`)
   - Load CT2 model + HuggingFace `MarianTokenizer` (or exact preprocessing exported with the converted model); do not rely on raw SentencePiece-only preprocessing
   - Interface: text input → translated output + inference time
   - Free CPU tier is single-user demo only: set `max_batch_size=1`, `max_input_length=512`, greedy decoding (`beam_size=1`) to control memory
   - Deploy to HF Spaces after local FastAPI path works

## Success Criteria

- [ ] Model converted to CTranslate2 INT8
- [ ] BLEU degradation ≤ 1 point vs FP32
- [ ] Inference ≥ 50 tok/s (single thread)
- [ ] Model pushed to private HuggingFace Hub repo
- [ ] Model visibility switched public only after Phase 6 gate passes
- [ ] Gradio demo live on HF Spaces

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| INT8 quality loss > 1 BLEU | Try INT8_FLOAT16 quantization |
| HF token leaked | Load from `HF_TOKEN`; never paste token into scripts/notebooks |
| HF Spaces too slow or OOM | Treat free tier as single-user demo; cap input length, batch size, and use greedy decoding (`beam_size=1`) |
