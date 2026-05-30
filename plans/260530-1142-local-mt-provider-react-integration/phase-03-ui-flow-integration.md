---
phase: 3
title: "UI flow integration"
status: completed
priority: P1
effort: "2h"
dependencies: [2]
---

# Phase 3: UI flow integration

## Context Links

- Settings provider selector: `components/modals/SettingsModal.tsx:164`
- Workspace key checks and workflow: `components/workspace/TranslationWorkspace.tsx:182`
- Workspace extraction step: `components/workspace/TranslationWorkspace.tsx:211`
- Workspace translation step: `components/workspace/TranslationWorkspace.tsx:251`
- Batch translate start: `components/modals/BatchTranslateModal.tsx:100`
- Batch extract start: `components/modals/BatchExtractModal.tsx:68`

## Overview

Expose local-mt in the React UI and guard workflows with local server health checks. Keep UI changes minimal and additive; do not implement a backend server or large redesign.

## Key Insights

- Current workspace blocks missing OpenAI/DeepSeek keys only (`TranslationWorkspace.tsx:186`); local-mt needs a server health preflight instead.
- Batch translate has same provider-key guard at `BatchTranslateModal.tsx:102` and must add local-mt health check before orchestrator start.
- Batch extract currently starts LLM extraction via orchestrator; local-mt offline mode must explain extraction requires an LLM and stop.

## Requirements

- Functional: `local-mt` appears as provider option in Settings.
- Functional: Settings UI includes endpoint URL, mode selector, hybrid target selector, connection test.
- Functional: Workspace and batch translate call `testLocalMTConnection` before local-mt translation.
- Functional: Batch extract blocks local-mt offline extraction unless explicit glossary provider is configured.
- Non-functional: No breaking UI changes for existing providers.

## Architecture

Data flow:
1. User selects local-mt in `SettingsModal` and configures endpoint/mode.
2. Settings persist through `useSettings`.
3. Workspace or batch start reads current settings.
4. If provider is local-mt, UI calls `testLocalMTConnection`.
5. On success, existing workflow continues into `aiService.ts`; on failure, UI shows startup instructions and aborts.
6. Extraction-only flow checks `localMtGlossaryProvider`; if `none`, shows explanation and exits before orchestrator.

## Related Code Files

- Modify: `components/modals/SettingsModal.tsx`
- Modify: `components/workspace/TranslationWorkspace.tsx`
- Modify: `components/modals/BatchTranslateModal.tsx`
- Modify: `components/modals/BatchExtractModal.tsx`
- Read/use: `services/aiService.ts`, `types.ts`
- Do not create/modify: Python server files.

## Implementation Steps

1. Ensure Phase 2 exports `testLocalMTConnection` and local-mt settings fields compile.
2. Update `SettingsModal.tsx`:
   - Add provider button `Local MT`.
   - Add endpoint input bound to `settings.localMtEndpoint`.
   - Add mode selector `Offline` / `Hybrid`.
   - Add hybrid target selector `Client-side` / `Server-side`, visible only in hybrid mode.
   - Add connection test button using `testLocalMTConnection`.
   - Add copy: offline needs local FastAPI-compatible server but no API key; hybrid may need LLM config depending target.
3. Update `TranslationWorkspace.tsx` before `setIsTranslating(true)`:
   - If `local-mt`, call health test.
   - On fail, log and alert startup instructions; return.
   - Skip/empty glossary extraction in pure offline unless explicit glossary provider configured by Phase 2.
4. Update `BatchTranslateModal.tsx`:
   - Run same local health preflight before constructing `BatchOrchestrator`.
   - Keep existing OpenAI/DeepSeek API key checks for those providers.
5. Update `BatchExtractModal.tsx`:
   - If provider local-mt and `localMtGlossaryProvider === 'none'`, show user-facing message and do not call orchestrator.
   - If explicit fallback provider is configured, ensure required key for fallback exists.
6. Run UI-related tests from Phase 1/2 and `npm run build`.

## Todo List

- [x] Add Local MT provider button and config panel.
- [x] Add connection test state/message in Settings modal.
- [x] Add workspace health preflight and local-mt extraction guard.
- [x] Add batch translate health preflight.
- [x] Add batch extract offline guard/fallback message.
- [x] Run tests and `npm run build`.

## Success Criteria

- [x] User can select `local-mt` and configure endpoint/mode.
- [x] Connection test shows success/failure without requiring LLM API key.
- [x] Workspace translation blocks with clear instructions if local server is unreachable.
- [x] Batch translate blocks with clear instructions if local server is unreachable.
- [x] Batch extract does not call Gemini implicitly in local-mt offline mode.
- [x] Existing provider UI and validation still works.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Settings modal grows too large | Medium | Medium | Minimal local-mt section; no redesign |
| Health preflight duplicated | Medium | Low | Small helper function if repeated in 2+ files; avoid over-abstraction |
| Offline extraction UX confusing | High | Medium | Clear copy: translation is offline; glossary extraction needs LLM |
| Batch resume with local server down | Medium | Medium | Preflight before start/resume when local-mt |

## Security Considerations

- Do not ask for or display local-mt API keys in offline mode.
- Endpoint input should be treated as user-controlled; avoid rendering it as HTML.
- Hybrid server-side text must not send browser API keys unless later explicitly implemented and reviewed.

## Backward Compatibility

Existing provider buttons and key fields remain unchanged. New local-mt fields are only shown when selected or relevant.

## Rollback Plan

Remove Local MT UI panel and preflight branches; core Phase 2 code can remain inert if `local-mt` is not selectable, or be reverted together if full rollback needed.

## File Ownership

- Phase 3 owns `components/modals/SettingsModal.tsx`, `components/workspace/TranslationWorkspace.tsx`, `components/modals/BatchTranslateModal.tsx`, `components/modals/BatchExtractModal.tsx`.
- It reads but should not edit `schema.ts`, `hooks/useSettings.ts`, `services/aiService.ts`, `services/api/local-mt.ts` unless a compile blocker is found.
