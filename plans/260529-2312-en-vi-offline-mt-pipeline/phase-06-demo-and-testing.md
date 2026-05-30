---
phase: 6
title: "Testing"
status: pending
priority: P2
effort: "3-4h"
dependencies: [4, 5]
---

# Phase 6: Testing

## Overview

E2E tests validating full pipeline: server → web app. Quality benchmark on val set. Glossary post-processing verification.

## Requirements

- Functional: E2E test covering full translation flow
- Functional: Glossary post-processing correctness tests
- Functional: Quality benchmark report

## Related Code Files

- Create: `tests/test_server.py` — FastAPI endpoint tests
- Create: `tests/test_glossary.py` — Glossary post-processing tests
- Create: `tests/test_quality.py` — BLEU benchmark
- Create: `tests/conftest.py` — Shared fixtures

## Implementation Steps

1. **Server tests** (`tests/test_server.py`)
   - `/api/health` returns 200
   - `/api/translate` with simple sentence
   - `/api/translate` with glossary terms (verify post-processing)
   - `/api/translate/batch` with 5 paragraphs
   - Error handling (empty text, very long text)

2. **Glossary tests** (`tests/test_glossary.py`)
   - Single term replacement
   - Multiple terms, longest-match-first
   - Case-insensitive matching
   - No-match scenario (text without glossary terms)
   - Term at start/end of sentence

3. **Quality benchmark** (`tests/test_quality.py`)
   - Translate val set with CT2 model
   - Compute BLEU, ChrF++
   - Report: baseline vs fine-tuned vs fine-tuned+glossary

## Success Criteria

- [ ] All server tests pass
- [ ] All glossary tests pass
- [ ] Quality benchmark: BLEU ≥ 30 on val set
- [ ] Glossary replacement accuracy ≥ 95% for exact matches

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Test flakiness from server startup | pytest fixtures with proper startup/teardown |
| BLEU metric not meaningful for literary text | Use ChrF++ as secondary, manual spot-check |
