---
phase: 4
title: "FastAPI Backend"
status: pending
priority: P1
effort: "4-6h"
dependencies: [3]
---

# Phase 4: FastAPI Backend

## Overview

Build FastAPI server wrapping CTranslate2 runtime. Includes post-processing glossary injection (deterministic term replacement). Runs locally alongside React web app.

## Requirements

- Functional: `/translate` endpoint with optional glossary terms
- Functional: Post-processing glossary: scan output → force-replace matched terms
- Functional: Batch endpoint for multiple paragraphs
- Non-functional: Response ≤ 2s for single paragraph (≤500 chars)

## Architecture

```
React App (localhost:5173)
  │
  ├─ POST /api/translate     → single text + glossary
  ├─ POST /api/translate/batch → batch paragraphs
  ├─ GET  /api/health        → server + model status
  └─ GET  /api/model/info    → model metadata
  │
  ▼
FastAPI Server (localhost:8000)
  │
  ├─ CT2Translator: CTranslate2 runtime (INT8 model)
  ├─ GlossaryPostProcessor:
  │   1. Translate full text (no modification)
  │   2. Scan VI output for glossary source terms' translations
  │   3. Force-replace with correct glossary translations
  └─ Response with translated text
```

## Glossary Post-Processing Logic

```python
def apply_glossary(vi_output: str, en_input: str, glossary: list[dict]) -> str:
    """
    1. For each glossary term, check if EN term exists in en_input
    2. If found, find model's translation of that term in vi_output
    3. Replace with glossary's correct VI translation
    
    Fallback: simple find-replace of common mistranslations
    Strategy: longest-match-first, case-insensitive
    """
```

## Related Code Files

- Create: `server/main.py` — FastAPI app entry point
- Create: `server/translator.py` — CTranslate2 wrapper class
- Create: `server/glossary.py` — Post-processing glossary logic
- Create: `server/schemas.py` — Pydantic request/response models
- Create: `server/config.py` — Server configuration
- Create: `server/requirements.txt` — fastapi, uvicorn, ctranslate2, sentencepiece, pydantic

## Implementation Steps

1. **Project setup**
   - Create `server/` directory at project root
   - `requirements.txt`: fastapi, uvicorn[standard], ctranslate2, sentencepiece, pydantic
   - Config: model path, CT2 threads (default: 4), port 8000

2. **CT2 translator wrapper** (`translator.py`)
   - Load model on startup (singleton)
   - `translate(text: str) -> str`: tokenize → translate → detokenize
   - `translate_batch(texts: list[str]) -> list[str]`: batch inference
   - SentencePiece tokenization/detokenization

3. **Glossary post-processor** (`glossary.py`)
   - `apply_glossary(vi_output, en_input, glossary_terms) -> str`
   - For each term in glossary: if EN term found in input, replace its VI translation in output
   - Longest-match-first to avoid partial replacements
   - Case-insensitive matching on EN side

4. **API endpoints** (`main.py`)
   ```
   POST /api/translate
   Body: { "text": str, "glossary": [{"input": str, "translation": str}]? }
   Response: { "translation": str, "time_ms": int }

   POST /api/translate/batch
   Body: { "texts": [str], "glossary": [...]? }
   Response: { "translations": [str], "time_ms": int }

   GET /api/health → { "status": "ok", "model_loaded": bool }
   GET /api/model/info → { "name": str, "quantization": str }
   ```

5. **CORS** — Allow localhost:5173 (Vite dev) and localhost:4173 (preview)

## Success Criteria

- [ ] Server starts and loads CT2 model in < 5s
- [ ] `/api/translate` returns correct translation
- [ ] Glossary post-processing replaces terms correctly
- [ ] `/api/translate/batch` handles 10+ paragraphs
- [ ] CORS allows React dev server
- [ ] Response ≤ 2s for single paragraph

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Glossary replace hits wrong substring | Longest-match-first + word boundary check |
| Model output doesn't contain expected term | Glossary is best-effort; hybrid mode LLM handles edge cases |
| Memory usage | INT8 model ~80MB, acceptable |
