---
phase: 4
title: "FastAPI Backend Implementation"
status: done
priority: P1
effort: "4-6h"
dependencies: []
parent_plan: "plans/260529-2312-en-vi-offline-mt-pipeline/phase-04-fastapi-backend.md"
---

# Phase 4: FastAPI Backend Implementation

## Overview

Build FastAPI server with mock translator (CT2-ready interface). All endpoints match the React client contracts from `services/api/local-mt.ts`.

**Key design decision:** Use a pluggable translator interface so the backend can run NOW with a mock translator and swap to CTranslate2 when Phase 3 completes — zero code changes needed.

## Contracts (from client)

### Request shapes (client sends)
```json
// POST /api/translate
{ "text": "str", "glossary": [{ "input": "str", "translation": "str", "matchType": "Exact|Case-Insensitive", "variants?": ["str"] }] }

// POST /api/translate/batch
{ "texts": ["str"], "glossary": [...] }

// POST /api/translate/hybrid
{ "text": "str", "glossary": [...], "llm_provider?": "str" }
// Headers: Authorization: Bearer <key> (optional)

// GET /api/health — no body
// GET /api/model/info — no body
```

### Response shapes (client expects)
```json
// POST /api/translate → { "translation": "str", "warnings": ["str"], "time_ms": int }
// POST /api/translate/batch → { "translations": ["str"], "warnings": ["str"], "time_ms": int }
// POST /api/translate/hybrid → { "translation": "str", "draft": "str", "warnings": ["str"], "time_ms": int }
// GET /api/health → { "status": "ok", "model_loaded": bool }
// GET /api/model/info → { "name": "str", "quantization": "str" }
```

## Architecture

```
server/
├── main.py              # FastAPI app + endpoints + CORS
├── config.py            # Settings from env vars
├── schemas.py           # Pydantic request/response models
├── translator.py         # Translator interface + MockTranslator (+ CT2Translator later)
├── glossary.py           # Best-effort glossary post-processor
├── hybrid.py             # Server-side LLM polish (optional)
├── requirements.txt      # Python dependencies
└── tests/
    ├── conftest.py
    ├── test_schemas.py
    ├── test_translator.py
    ├── test_glossary.py
    └── test_api.py
```

## Implementation Steps

### Step 1: Project setup
- Create `server/` directory + `server/tests/`
- Write `requirements.txt`
- Write `config.py` with env var loading
- Verify: `pip install -r requirements.txt` succeeds

### Step 2: Pydantic schemas
- Request models with strict validation (min_length, max_length, regex)
- Response models matching client contracts
- Batch size limit: 50, text length limit: 5000
- Verify: schema unit tests pass (RED → GREEN)

### Step 3: Translator interface + mock
- Abstract `Translator` protocol
- `MockTranslator`: deterministic mock returning `[VI] {input}` prefix
- Ready for `CT2Translator` swap-in later
- Verify: translator unit tests pass

### Step 4: Glossary post-processor
- Longest-match-first sort by EN length descending
- Unicode word-boundary regex match per `matchType`
- `re.escape()` all glossary/variant strings
- Protected replaced regions from shorter-term collisions
- Warning when no variant found in output
- Verify: glossary unit tests pass

### Step 5: API endpoints
- `GET /api/health` — status + model_loaded
- `GET /api/model/info` — model metadata
- `POST /api/translate` — single text + glossary
- `POST /api/translate/batch` — batch texts
- `POST /api/translate/hybrid` — MT + LLM polish placeholder
- Verify: API integration tests pass

### Step 6: Security & safety
- CORS: `ALLOWED_ORIGINS` env var, default localhost dev origins
- Never log Authorization headers
- Request validation via Pydantic
- Hybrid timeout (30s) + semaphore guard
- Verify: security checks pass, no key leaks in logs

### Step 7: Server startup test
- `uvicorn server.main:app --port 8000`
- curl all endpoints, verify responses
- Verify: client `testLocalMTConnection` passes against running server

## Success Criteria
- [ ] All 5 endpoints return correct JSON shapes
- [ ] Pydantic rejects invalid requests (empty text, oversized, too many batch items)
- [ ] Glossary post-processing works with longest-match-first
- [ ] CORS configured from env var, defaults to localhost
- [ ] Authorization headers never logged
- [ ] Mock translator returns deterministic output
- [ ] All pytest tests pass
- [ ] Server starts and responds to health check

## Notes
- Model is mocked — `MockTranslator` returns `[VI] {input}` prefix for testing
- When CT2 model is available, swap `MockTranslator` → `CT2Translator` with no endpoint changes
- Hybrid endpoint is a functional placeholder — real LLM integration needs Phase 5 coordination
