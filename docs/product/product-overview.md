# Product Overview

## What

AI Novel Weaver is a browser-based translation workbench for long-form fiction.
It pairs human editors with AI providers (Gemini, OpenAI, DeepSeek, Local MT)
to produce genre-aware Vietnamese translations of English novels — primarily wuxia,
xianxia, and modern urban fiction.

## Target Users

- Solo translators working on web novel serializations
- Translation groups managing multi-chapter projects with consistent terminology
- Hobbyist readers who want quick draft translations of untranslated novels

## Key Value Propositions

1. **Genre-aware prompts** — built-in Sino-Vietnamese transliteration rules for
   martial arts, cultivation, and modern urban terminology.
2. **Glossary-first workflow** — extract, review, and enforce terminology before
   translating, ensuring consistency across hundreds of chapters.
3. **Multi-provider flexibility** — switch between Gemini, OpenAI, DeepSeek,
   and a local MT server without changing workflow.
4. **Offline-capable storage** — all project data persists in IndexedDB; no
   hosted server required for the core editing loop.
5. **Batch processing** — translate or extract glossary for multiple chapters in
   one operation with progress tracking.

## Tech Stack Summary

| Layer | Choice |
|-------|--------|
| Runtime | Browser (SPA) |
| Framework | React 19 |
| Bundler | Vite 6 |
| Language | TypeScript 5.8 |
| Styling | Tailwind CSS (CDN) |
| Validation | Zod |
| Persistence | IndexedDB via `idb` |
| AI Providers | Gemini (`@google/genai`), OpenAI-compatible, DeepSeek, Local MT (`/api/translate`) |
| Export | `docx`, `jspdf` |

## Current State

- Core translation loop functional (single + batch)
- Glossary management operational
- Export to DOCX/PDF working
- Optional local MT provider integration implemented for local FastAPI-compatible servers
- No authentication, no hosted backend server
- Vitest suite installed for schema/settings/service contract coverage
- Offline MT backend/model pipeline remains tracked in `plans/260529-2312-en-vi-offline-mt-pipeline/`

## Non-Goals (Current Scope)

- Multi-user collaboration
- Server-side storage or sync
- Mobile-native app
- Source language detection (user selects manually)
