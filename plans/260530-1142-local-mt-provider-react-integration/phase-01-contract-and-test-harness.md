---
phase: 1
title: "Contract and test harness"
status: completed
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Contract and test harness

## Context Links

- Upstream Phase 4 API contract: `plans/260529-2312-en-vi-offline-mt-pipeline/phase-04-fastapi-backend.md:31`
- Upstream Phase 5 integration requirements: `plans/260529-2312-en-vi-offline-mt-pipeline/phase-05-web-app-integration.md:54`
- Current scripts have only Vite build/dev/preview: `package.json:6`

## Overview

Lock the browser-side contract and TDD surface before implementation. If adding a runner, prefer Vitest because Vite/TS already exists; if not accepted, still write executable pure-function tests/scripts before product code.

## Key Insights

- No standardized test runner exists; current validation is `npm run build` only (`package.json:6`).
- `TranslationSettingsSchema` drives inferred app settings types via `types.ts:25`, so schema test coverage prevents drift.
- The local-mt client can be unit-tested against mocked `fetch` without needing a Python server.

## Requirements

- Functional: Define `local-mt` settings fields and API request/response contract in tests first.
- Functional: Tests assert glossary mapping sends only `input`, `translation`, `matchType`, optional future `variants`; never `id`/`gender`.
- Functional: Tests assert `local-mt` extraction does not call Gemini implicitly.
- Non-functional: No Python/FastAPI files created.

## Architecture

Data flow under test:
1. Settings JSON/localStorage enters `useSettings` migration.
2. Zod schema transforms/validates into `TranslationSettings`.
3. `aiService.ts` routes by `settings.aiProvider`.
4. `services/api/local-mt.ts` transforms settings + glossary into HTTP requests.
5. Output exits as translation string or explicit error/warning.

## Related Code Files

- Modify: `package.json` only if adding Vitest scripts/dependency.
- Create: test files adjacent to or under a small `tests/` folder if accepted.
- Read/target: `schema.ts`, `types.ts`, `hooks/useSettings.ts`, `services/aiService.ts`, `services/api/*`.
- Do not create: `server/*`, `backend/*`, root `api/*`.

## Implementation Steps

1. Decide test path:
   - Preferred: add `vitest` dev dependency and `test` script.
   - Fallback: write minimal TS/node contract smoke script and keep `npm run build` as gate.
2. Write failing tests for `TranslationSettingsSchema` accepting `local-mt` and default-like fields.
3. Write failing tests for local-mt request contract:
   - `GET {endpoint}/api/health`
   - `POST {endpoint}/api/translate`
   - `POST {endpoint}/api/translate/hybrid`
   - endpoint URL normalization trims trailing slash.
4. Write failing tests for provider dispatch:
   - `translateText` and `translateTextStream` choose local-mt branch.
   - `extractGlossaryTerms` returns `[]` or explicit configured LLM fallback; never Gemini by default.
5. Write failing migration/default tests for legacy persisted settings missing local-mt fields.

## Todo List

- [x] Add or confirm test runner strategy.
- [x] Add RED tests for settings schema and migration defaults.
- [x] Add RED tests for local-mt API client contract and glossary mapping.
- [x] Add RED tests for `aiService.ts` routing/no fallback.
- [x] Confirm RED failures are due to missing implementation, not broken test setup.

## Success Criteria

- [x] Tests fail before implementation for expected missing local-mt behavior.
- [x] Build/test commands are documented in the final implementation report.
- [x] No backend/server files exist or are touched.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Adding Vitest expands scope | Medium | Medium | Keep dependency minimal; fallback to build-only if user declines |
| Tests mock too much and miss fetch shape | Medium | High | Assert exact URL, method, headers, JSON body |
| Provider fallback regression hidden | High | High | Dedicated test for no implicit Gemini when `local-mt` |

## Security Considerations

- Tests must assert no API keys are required for offline local-mt.
- Server-side hybrid, if planned later, must not log or expose Authorization; not implemented now.

## Rollback Plan

Remove test runner/script and test files. No product code changes in this phase, so rollback is isolated.

## File Ownership

- Phase owner touches only `package.json` and test files. Later phases own production files.
