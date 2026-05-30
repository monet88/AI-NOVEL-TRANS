---
phase: 5
title: "Web App Integration"
status: done
priority: P1
effort: "4-6h"
dependencies: [4]
---

# Phase 5: Web App Integration

## Overview

Add `local-mt` as a new AI provider in the existing React web app. Two modes: Pure Offline (MT only, $0) and Hybrid (MT + LLM polish). Glossary terms from existing glossary system are mapped to the FastAPI request shape for best-effort post-processing.

Execution mode for this phase: Claude implements integration code paths and runs local validation/test commands directly.

## Requirements

- Functional: New `local-mt` provider option in settings UI
- Functional: Pure Offline mode: text → FastAPI → translated text (with best-effort glossary post-processing)
- Functional: Hybrid mode: text → FastAPI → LLM polish → final text (both client-side and server-side)
- Functional: `local-mt` never falls through to Gemini when no API key is configured
- Functional: Server health preflight before workspace/batch translation starts
- Non-functional: No breaking changes to existing providers

## Architecture

```
TranslationSettings.aiProvider: 'gemini' | 'openai' | 'deepseek' | 'local-mt'
                                                                      │
                                                          ┌───────────┴───────────┐
                                                          │                       │
                                                    Pure Offline              Hybrid
                                                          │                  ┌────┴────┐
                                                    FastAPI /translate   Client-side  Server-side
                                                    + glossary post-proc  LLM polish  /api/translate/hybrid
                                                          ▼                  ▼              ▼
                                                    VI output         VI (refined)   VI (refined)
```

## Related Code Files

- Create: `services/api/local-mt.ts` — Local MT provider API client
- Modify: `services/aiService.ts` — Add local-mt routing in all provider entry points
- Modify: `schema.ts` — Add 'local-mt' to aiProvider enum + settings fields
- Modify: `constants.ts` — Add local-mt defaults
- Modify: `hooks/useSettings.ts` — Migrate missing local-mt fields for existing localStorage
- Modify: `components/modals/SettingsModal.tsx` — Add local-mt config UI
- Modify: `components/workspace/TranslationWorkspace.tsx` — Local server health preflight + offline extraction behavior
- Modify: `components/modals/BatchTranslateModal.tsx` — Local server health preflight
- Modify: `components/modals/BatchExtractModal.tsx` — Disable/redirect extraction when local-mt has no LLM provider

## Implementation Steps

1. **Update schema and defaults** (`schema.ts`, `constants.ts`, `hooks/useSettings.ts`)
   - Add `'local-mt'` to aiProvider enum
   - Add fields: `localMtEndpoint` (default `http://localhost:8000`), `localMtMode` (`offline` | `hybrid`), `localMtHybridTarget` (`client` | `server`, default `client`)
   - Add optional extraction fallback field only if needed: `localMtGlossaryProvider` (`gemini` | `openai` | `deepseek` | `none`)
   - Existing persisted settings must migrate safely: fill missing local-mt fields with defaults in `useSettings.ts`

2. **Create local-mt API client** (`services/api/local-mt.ts`)
   - `translateWithLocalMT(text, settings, glossary)` — POST to `/api/translate`
   - `translateWithLocalMTStream(text, settings, onChunk, glossary)` — chunk response for UI consistency
   - `translateWithLocalMTHybrid(text, settings, glossary)` — POST to `/api/translate/hybrid` when server-side hybrid selected
   - `testLocalMTConnection(settings)` — GET `/api/health`
   - Map glossary terms before sending: `{ input, translation, matchType }`; do not send `id`/`gender`
   - Include optional `variants` only if user glossary model later supports it

3. **Update all provider routing entry points** (`services/aiService.ts`)
   - `extractGlossaryTerms`: for `local-mt`, do **not** fall through to Gemini.
     - V1 behavior: return `[]` with clear UI warning, or route to `localMtGlossaryProvider` if configured.
     - Pure Offline must not require any LLM API key.
   - `translateTextStream`: add `local-mt` branch before Gemini fallback.
   - `translateText`: add `local-mt` branch before Gemini fallback.
   - Avoid implicit Gemini default for unknown providers; fail clearly if provider is unsupported.

4. **Hybrid mode** (both client-side and server-side)
   - **Client-side:** After receiving MT output from FastAPI, call existing LLM provider from browser
   - **Server-side:** POST `/api/translate/hybrid` — server calls LLM internally using header key or server env fallback
   - Prompt: "Polish this Vietnamese translation for fluency. Keep proper nouns. Source: {en}. Draft: {mt_output}"
   - Default: client-side (reuses existing API keys); server-side optional for headless/batch use
   - Add LLM polish timeout (match server default, e.g. 30s)
   - **Fallback on LLM failure/timeout:** Show raw MT output + warning badge ("Polish failed, showing raw MT") + manual retry button. User can retry LLM polish without re-running MT.

5. **Server health preflight in UI flows**
   - `TranslationWorkspace.tsx`: before starting translation with `local-mt`, call `/api/health`; if offline, show startup instructions and stop.
   - `BatchTranslateModal.tsx`: block batch start if `local-mt` server unreachable.
   - `BatchExtractModal.tsx`: if `aiProvider === 'local-mt'` and no `localMtGlossaryProvider`, explain extraction needs an LLM provider; do not call Gemini implicitly.

6. **Settings UI**
   - Endpoint URL field
   - Mode selector: Offline / Hybrid
   - Hybrid target selector: Client-side / Server-side
   - Connection test button calling `testLocalMTConnection`
   - Copy explaining: Pure Offline needs no API key; Hybrid needs existing LLM provider key or server env fallback.

## Success Criteria

- [ ] `local-mt` appears as provider option
- [ ] Existing saved settings load without undefined local-mt fields
- [ ] Pure Offline translates without any API key
- [ ] `extractGlossaryTerms` does not call Gemini when provider is `local-mt`
- [ ] Workspace and batch flows check FastAPI health before starting local translation
- [ ] Hybrid mode produces polished output
- [ ] Hybrid timeout/failure falls back to raw MT + warning + manual retry
- [ ] Glossary terms sent to server as `{input, translation, matchType}` and applied best-effort
- [ ] Connection test shows server status
- [ ] No regressions in existing providers

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking existing providers | Additive branches in all provider entry points; avoid implicit Gemini fallback for unknown provider |
| `local-mt` extraction crashes offline mode | Skip extraction or require explicit secondary LLM provider; never fall through to Gemini |
| Server not running UX | Health preflight in workspace and batch modals + clear startup instructions |
| Existing localStorage lacks new fields | `useSettings.ts` migration fills defaults |
| Hybrid mode double-cost confusion | UI label showing cost estimate per mode |
| LLM polish hangs/fails (quota/network) | Timeout + fallback raw MT output + warning badge + manual retry button |
