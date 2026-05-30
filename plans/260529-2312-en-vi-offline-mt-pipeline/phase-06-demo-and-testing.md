---
phase: 6
title: "Testing"
status: pending
priority: P2
effort: "4-6h"
dependencies: [4, 5]
---

# Phase 6: Testing

## Overview

E2E tests validating full pipeline: server → web app. Quality benchmark uses a representative subset for fast feedback, with optional full validation set run as a background job. Glossary post-processing verification covers best-effort behavior.

Execution mode for this phase: Claude runs test/benchmark/demo commands directly and reports results with logs.

## Requirements

- Functional: E2E test covering full translation flow
- Functional: Glossary post-processing correctness tests for known variants and no-variant warnings
- Functional: Fast subset quality benchmark report
- Functional: Full validation benchmark (~17k pairs) is mandatory before shipping

## Related Code Files

- Create: `tests/test_server.py` — FastAPI endpoint tests
- Create: `tests/test_glossary.py` — Glossary post-processing tests
- Create: `tests/test_quality.py` — BLEU benchmark subset + optional full run
- Create: `tests/conftest.py` — Shared fixtures
- Create/Modify: frontend tests for local-mt provider flows if project test framework exists

## Implementation Steps

1. **Server tests** (`tests/test_server.py`)
   - `/api/health` returns 200
   - `/api/translate` with simple sentence
   - `/api/translate` with glossary variants (verify best-effort replacement)
   - `/api/translate/batch` with 5 paragraphs
   - Pydantic validation: empty text, text >5000 chars, batch >50, oversized batch item
   - `/api/translate/hybrid` timeout/failure returns raw MT draft + warning

2. **Glossary tests** (`tests/test_glossary.py`)
   - Single known-variant replacement
   - Multiple terms, longest-match-first
   - `matchType=Exact` vs `matchType=Case-Insensitive`
   - No-variant scenario returns unchanged output + warning
   - Overlapping terms protect replaced regions from shorter-term corruption
   - Regex special characters are escaped safely

3. **Frontend integration tests**
   - `local-mt` provider selection loads defaults for existing settings
   - Pure Offline does not require any API key
   - `extractGlossaryTerms` with `local-mt` does not fall through to Gemini
   - Workspace local translation health preflight blocks when server is down
   - Batch translate health preflight blocks when server is down
   - Hybrid fallback shows raw MT + warning + manual retry button

4. **Quality benchmark** (`tests/test_quality.py`)
   - Fast benchmark: random 500-1000 pairs from val set for local iteration
   - Compute BLEU, ChrF++
   - Report: baseline vs fine-tuned vs fine-tuned+glossary where applicable
   - Full val benchmark (~17k pairs) is required release gate before shipping model

## Success Criteria

- [ ] All server tests pass
- [ ] All glossary tests pass
- [ ] Local-mt provider tests cover extraction skip, health preflight, timeout fallback, settings migration
- [ ] Fast quality benchmark subset reports BLEU/ChrF++
- [ ] Full validation benchmark (~17k pairs) executed successfully before shipping model
- [ ] BLEU ≥ 30 on full validation benchmark before shipping model
- [ ] Glossary replacement accuracy ≥ 95% for known-variant exact matches

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Test flakiness from server startup | pytest fixtures with proper startup/teardown |
| Full 17k BLEU benchmark exceeds phase time | Keep 500-1000 subset for rapid local iteration, but treat full 17k benchmark as hard release gate before shipping |
| BLEU metric not meaningful for literary text | Use ChrF++ as secondary, manual spot-check |
| Frontend lacks test framework | Document manual verification steps or add minimal test harness only if project conventions support it |
