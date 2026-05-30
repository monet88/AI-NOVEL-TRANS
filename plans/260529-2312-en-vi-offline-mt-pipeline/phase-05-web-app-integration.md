---
phase: 5
title: "Web App Integration"
status: pending
priority: P1
effort: "4-6h"
dependencies: [4]
---

# Phase 5: Web App Integration

## Overview

Add `local-mt` as a new AI provider in the existing React web app. Two modes: Pure Offline (MT only, $0) and Hybrid (MT + LLM polish). Glossary terms from existing glossary system sent to FastAPI for post-processing.

## Requirements

- Functional: New `local-mt` provider option in settings UI
- Functional: Pure Offline mode: text → FastAPI → translated text (with glossary post-processing)
- Functional: Hybrid mode: text → FastAPI → LLM polish → final text
- Non-functional: No breaking changes to existing providers

## Architecture

```
TranslationSettings.aiProvider: 'gemini' | 'openai' | 'deepseek' | 'local-mt'
                                                                      │
                                                          ┌───────────┴───────────┐
                                                          │                       │
                                                    Pure Offline              Hybrid
                                                          │                       │
                                                    FastAPI /translate      FastAPI /translate
                                                    + glossary post-proc    + LLM polish (client)
                                                          ▼                       ▼
                                                    VI output              VI output (refined)
```

## Related Code Files

- Create: `services/api/local-mt.ts` — Local MT provider API client
- Modify: `services/aiService.ts` — Add local-mt routing
- Modify: `schema.ts` — Add 'local-mt' to aiProvider enum + settings fields
- Modify: `components/modals/SettingsModal.tsx` — Add local-mt config UI
- Modify: `constants.ts` — Add local-mt defaults

## Implementation Steps

1. **Update schema** (`schema.ts`)
   - Add `'local-mt'` to aiProvider enum
   - Add fields: `localMtEndpoint` (default "http://localhost:8000"), `localMtMode` ('offline' | 'hybrid')

2. **Create local-mt API client** (`services/api/local-mt.ts`)
   - `translateWithLocalMT(text, settings)` — POST to `/api/translate` with glossary terms
   - `translateWithLocalMTStream(text, settings, onChunk)` — chunk response for UI consistency
   - `testLocalMTConnection(settings)` — GET `/api/health`
   - Pass `settings.glossary` terms to request body (server does post-processing)

3. **Hybrid mode** (client-side LLM polish)
   - After receiving MT output from FastAPI, call existing LLM provider
   - Prompt: "Polish this Vietnamese translation for fluency. Keep proper nouns. Source: {en}. Draft: {mt_output}"
   - Uses Gemini Flash (cheapest) — key already in client settings

4. **Update aiService.ts** — Add `local-mt` case to provider switch

5. **Settings UI** — Endpoint URL, mode selector (Offline/Hybrid), connection test button

## Success Criteria

- [ ] `local-mt` appears as provider option
- [ ] Pure Offline translates without any API key
- [ ] Hybrid mode produces polished output
- [ ] Glossary terms sent to server and applied in output
- [ ] Connection test shows server status
- [ ] No regressions in existing providers

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking existing providers | Additive change (new else-if branch) |
| Server not running UX | Clear error with startup instructions |
| Hybrid mode double-cost confusion | UI label showing cost estimate per mode |
