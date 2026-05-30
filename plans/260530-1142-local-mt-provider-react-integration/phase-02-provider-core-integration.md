---
phase: 2
title: "Provider core integration"
status: completed
priority: P1
effort: "3h"
dependencies: [1]
---

# Phase 2: Provider core integration

## Context Links

- Existing provider routing: `services/aiService.ts:13`, `services/aiService.ts:35`, `services/aiService.ts:68`
- Existing provider client pattern: `services/api/openai.ts:87`, `services/api/openai.ts:152`
- Settings schema source of inferred type: `schema.ts:35`, `types.ts:25`
- Settings migration/defaulting: `hooks/useSettings.ts:43`

## Overview

Add local-mt as a first-class TypeScript provider: schema/settings fields, local API client, and explicit routing. This phase creates no Python server; it consumes the Phase 4 HTTP contract only.

## Key Insights

- Current code defaults missing/unknown providers to Gemini in three places (`services/aiService.ts:22`, `services/aiService.ts:45`, `services/aiService.ts:77`), which conflicts with Phase 5 requirement.
- Existing app stores API keys in browser settings; local-mt offline mode must not require them.
- `BatchOrchestrator` mutates `this.settings.glossary` at `services/batchOrchestrator.ts:261`; avoid broad refactor here, but do not add more shared mutable settings state.

## Requirements

- Functional: Add `local-mt` to `TranslationSettingsSchema.aiProvider`.
- Functional: Add settings fields: `localMtEndpoint`, `localMtMode`, `localMtHybridTarget`, optional `localMtGlossaryProvider`.
- Functional: Create `services/api/local-mt.ts` with health, translate, stream-compatible translate, hybrid.
- Functional: Update `services/aiService.ts` exports and dispatch.
- Non-functional: Existing Gemini/OpenAI/DeepSeek behavior preserved.

## Architecture

Data flow:
1. User/provider setting enters `TranslationSettings`.
2. `aiService.ts` dispatch checks `settings.aiProvider` explicitly.
3. For `local-mt`, pure offline path sends source text + mapped glossary to local endpoint `/api/translate`.
4. Stream API adapts one-shot local result by calling `onChunk(translation)` once for UI compatibility.
5. Hybrid client target is planned as MT draft then existing LLM polish; server target posts `/api/translate/hybrid`.
6. Result exits as plain translated string to current callers.

## Related Code Files

- Modify: `schema.ts`
- Modify: `hooks/useSettings.ts`
- Modify: `services/aiService.ts`
- Create: `services/api/local-mt.ts`
- Possibly modify: `constants.ts` for shared defaults if implementation chooses constants over inline defaults.
- Read-only/context: `types.ts`, `services/api/gemini.ts`, `services/api/openai.ts`, `services/api/deepseek.ts`.

## Implementation Steps

1. Make Phase 1 tests RED and keep them visible.
2. Update `schema.ts`:
   - `aiProvider: z.enum(['gemini','openai','deepseek','local-mt'])`.
   - Add `localMtEndpoint: z.string()` with default-like app value handled in settings.
   - Add `localMtMode: z.enum(['offline','hybrid'])`.
   - Add `localMtHybridTarget: z.enum(['client','server'])`.
   - Add `localMtGlossaryProvider: z.enum(['gemini','openai','deepseek','none'])` if needed for extraction fallback.
3. Update `hooks/useSettings.ts` initial state and legacy migration with defaults:
   - endpoint `http://localhost:8000`
   - mode `offline`
   - hybrid target `client`
   - glossary provider `none`
4. Implement `services/api/local-mt.ts`:
   - normalize base endpoint.
   - `testLocalMTConnection(settings)` calls `/api/health` with timeout.
   - `translateWithLocalMT(...)` posts `{ text, glossary }`.
   - `translateWithLocalMTStream(...)` calls non-stream function then emits one chunk.
   - `translateWithLocalMTHybrid(...)` posts hybrid endpoint for server target.
   - map glossary without `id`/`gender`.
5. Update `services/aiService.ts`:
   - import local-mt client.
   - route `translateText` and `translateTextStream` before any Gemini fallback.
   - route `extractGlossaryTerms` for local-mt to `[]` by default or explicit selected LLM provider.
   - unknown provider throws explicit unsupported-provider error.
   - export `testLocalMTConnection`.
6. Run Phase 1 tests and `npm run build`.

## Todo List

- [x] Extend schema and settings defaults.
- [x] Add safe migration for legacy persisted settings.
- [x] Create local-mt client with timeout and exact request mapping.
- [x] Add aiService dispatch and exports.
- [x] Make RED tests pass.
- [x] Run `npm run build`.

## Success Criteria

- [x] `local-mt` compiles as valid `TranslationSettings.aiProvider`.
- [x] Existing saved settings load without undefined local-mt fields.
- [x] Pure offline translation does not require any LLM API key.
- [x] `extractGlossaryTerms` does not call Gemini implicitly for local-mt.
- [x] Glossary request body excludes client-only `id` and `gender`.
- [x] Unsupported provider fails clearly.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Breaking existing providers | Medium | High | Additive branches; retain existing client function signatures; regression tests |
| Implicit Gemini fallback remains | High | High | Replace else fallback with exhaustive dispatch + tests |
| Local endpoint hangs UI | Medium | High | Use AbortController timeout in local client |
| Endpoint normalization bugs | Medium | Medium | Test trailing slash and no trailing slash |

## Security Considerations

- Do not include Authorization headers in offline calls.
- Never log API keys or local request bodies with user text by default.
- Treat endpoint as user-configurable; validate it is a parseable URL in client code or UI.

## Backward Compatibility

All new settings fields must be optional from persisted-data perspective: older localStorage merges into defaults from `useSettings.ts`.

## Rollback Plan

Remove `services/api/local-mt.ts`; remove local-mt schema fields/defaults; restore `aiService.ts` dispatch to only existing providers. Since migration is additive, no stored data deletion needed.

## File Ownership

- Phase 2 owns `schema.ts`, `hooks/useSettings.ts`, `services/aiService.ts`, `services/api/local-mt.ts`, optional `constants.ts`.
- Phase 3 must not edit these except import/use call sites unless coordinated.
