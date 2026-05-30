---
title: "Local MT Provider React Integration"
description: "Plan TDD-first React/TS integration for local-mt provider without implementing Python backend."
status: completed
priority: P1
effort: 7h
branch: main
tags: [react, typescript, local-mt, tdd]
blockedBy: [260529-2312-en-vi-offline-mt-pipeline]
blocks: []
created: 2026-05-30
---

# Local MT Provider React Integration

## Scope

Implement Phase 4+5 consumer-side work only: local-mt API contract/client, provider routing, settings/UI preflight. Do not create Python/FastAPI server in this pass: no `server/`, `backend/`, or root `api/` directory exists (checked 2026-05-30).

## Source Plan Inputs

- Phase 4 defines intended FastAPI endpoints `/api/translate`, `/api/translate/batch`, `/api/translate/hybrid`, `/api/health`, `/api/model/info` in `plans/260529-2312-en-vi-offline-mt-pipeline/phase-04-fastapi-backend.md:31`.
- Phase 5 requires adding `local-mt` to provider settings and web flows in `plans/260529-2312-en-vi-offline-mt-pipeline/phase-05-web-app-integration.md:14`.

## Current Code Touchpoints Verified

- Provider enum currently only `gemini|openai|deepseek`: `schema.ts:35`.
- Persisted settings migration/defaults live in `hooks/useSettings.ts:10` and `hooks/useSettings.ts:43`.
- Provider routing falls through to Gemini by default: `services/aiService.ts:22`, `services/aiService.ts:45`, `services/aiService.ts:77`.
- Existing API clients live under `services/api/*`; current files: `gemini.ts`, `openai.ts`, `deepseek.ts`.
- Settings provider buttons are in `components/modals/SettingsModal.tsx:164`.
- Workspace workflow extracts glossary before translation at `components/workspace/TranslationWorkspace.tsx:211` and translates at `components/workspace/TranslationWorkspace.tsx:251`.
- Batch translate starts in `components/modals/BatchTranslateModal.tsx:100`; batch extract starts in `components/modals/BatchExtractModal.tsx:68`.

## Phases

| Phase | Name | Status | Depends |
|---|---|---|---|
| 1 | [Contract and test harness](./phase-01-contract-and-test-harness.md) | Completed | none |
| 2 | [Provider core integration](./phase-02-provider-core-integration.md) | Completed | 1 |
| 3 | [UI flow integration](./phase-03-ui-flow-integration.md) | Completed | 2 |

## Execution TODO Order

- [x] Phase 1: Add/choose TS test runner, write failing tests for settings schema/migration, local-mt client contract, no-Gemini fallback.
- [x] Phase 2: Implement schema/settings fields, `services/api/local-mt.ts`, `aiService.ts` routing, exports.
- [x] Phase 3: Add Settings UI, connection test, workspace/batch health preflight, extraction guard.
- [x] Run `npm run build`; run new tests if added.
- [x] Reviewer pass: verify no Python server files, no implicit Gemini fallback, no leaked keys.

## Backward Compatibility

Additive only. Existing persisted settings must hydrate defaults for new fields. Existing `gemini`, `openai`, `deepseek` flows must keep current behavior except unsupported provider should fail clearly.

## Rollback

Revert this plan's implementation by removing `local-mt` schema fields/client/UI branches and restoring `aiService.ts` provider dispatch to current three providers. No data migration destructive changes allowed.

## Unresolved Questions

- None for planning. During implementation, choose Vitest only if user accepts adding a dev dependency; otherwise use build-only plus pure function smoke tests.
