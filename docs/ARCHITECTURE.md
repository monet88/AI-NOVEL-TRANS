# Architecture

## Stack

| Concern | Choice |
|---------|--------|
| Surface | Browser SPA |
| Framework | React 19 |
| Bundler | Vite 6 |
| Language | TypeScript 5.8 |
| Styling | Tailwind CSS (CDN script tag) |
| Validation | Zod 4 |
| Persistence | IndexedDB via `idb` |
| AI Providers | Gemini (`@google/genai`), OpenAI-compatible, DeepSeek |
| Export | `docx`, `jspdf` |
| IDs | `uuid` |

## Project Structure

```text
/ (root — no src/ directory)
├── index.html          — Vite entry, Tailwind config, importmap
├── index.tsx           — React root mount
├── App.tsx             — Top-level routing (dashboard vs workspace)
├── schema.ts           — Zod schemas (source of truth)
├── types.ts            — Inferred TypeScript types from schemas
├── constants.ts        — Genre prompt templates, UI constants
├── vite.config.ts      — Vite + React plugin, env injection
│
├── contexts/           — React Context providers
│   ├── AppProviders    — Composition root for all providers
│   ├── ProjectContext  — Project CRUD, chapter management, view state
│   ├── UIContext       — Modal states, find-replace, sidebar
│   └── GlossaryContext — Glossary state, review workflow
│
├── hooks/              — Custom hooks
│   ├── useProjects     — Project persistence bridge
│   ├── useSettings     — Settings load/save
│   ├── useModals       — Modal open/close state
│   ├── useLogs         — Translation log accumulator
│   ├── useCountdown    — Timer utility
│   └── useTermHighlighter — Glossary term highlighting in text
│
├── services/           — Business logic (no React dependency)
│   ├── aiService.ts    — Provider-agnostic translation + extraction API
│   ├── api/            — Provider implementations (gemini/, openai/, deepseek/)
│   ├── geminiService.ts — Legacy Gemini direct calls
│   ├── batchOrchestrator.ts — Multi-chapter batch processing (EventEmitter)
│   ├── persistenceService.ts — IndexedDB read/write
│   ├── exportService.ts — DOCX/PDF generation
│   └── utils.ts        — Prompt template builder, text utilities
│
├── components/
│   ├── layout/         — Header, Sidebar, ProjectSelectionView
│   ├── workspace/      — TranslationWorkspace (editor area)
│   ├── modals/         — BatchTranslate, BatchExtract, Export, FindReplace, Import
│   ├── glossary/       — GlossaryView, GlossaryTermPopover, UsageReport
│   └── icons/          — SVG icon components
│
└── docs/, plans/, scripts/  — Harness infrastructure
```

## Layering (Actual)

```text
schema.ts + types.ts (data contracts)
  <- services/ (business logic, no React)
      <- hooks/ (React bridge to services)
          <- contexts/ (shared state composition)
              <- components/ (UI)
```

This is a pragmatic flat architecture. No domain/application/infrastructure
separation — the app is a single-surface browser tool with no backend.

## Dependency Rule (Adapted)

| Layer | May import | Must not import |
|-------|-----------|-----------------|
| schema, types | zod only | anything else |
| services | types, external libs (idb, docx, genai) | React, hooks, contexts, components |
| hooks | services, types | contexts, components |
| contexts | hooks, services, types | components |
| components | contexts, hooks, types | services directly (use hooks/contexts) |

## Boundary Parsing

Zod schemas in `schema.ts` define the parse boundary. Data entering the app
(imported JSON projects, AI extraction responses, file imports) is validated
against these schemas before entering state.

## State Architecture

No external state library. State lives in React Context:

- **ProjectContext** — project list, active project, chapters, view routing
- **UIContext** — modal visibility, find-replace state, sidebar toggle
- **GlossaryContext** — glossary terms, review workflow state

Settings are managed via `useSettings` hook (localStorage/IndexedDB).

## AI Provider Abstraction

```text
aiService.ts (facade)
  ├── api/gemini/    — @google/genai SDK
  ├── api/openai/    — fetch-based, OpenAI-compatible endpoint
  ├── api/deepseek/  — fetch-based, DeepSeek endpoint
  └── api/local-mt/  — fetch-based local FastAPI endpoint
```

All providers implement the same interface: `translateTextStream`,
`translateText`, `extractGlossaryTerms`. Provider selection is runtime
(`settings.aiProvider`), including `local-mt` with explicit local endpoint and
fallback LLM settings when configured.

## Persistence

IndexedDB only. No server. No sync.

- `projects` store: full Project objects (chapters inline)
- `glossary` store: shared GlossaryTerm array

Trade-off: simple but no cross-device sync, no conflict resolution, no backup
beyond manual JSON export.

## Known Constraints

- Tailwind loaded via CDN script tag (no purging, no build-time optimization)
- No routing library — view state managed in Context (`dashboard` | `workspace`)
- Vitest is installed for browser-side contract and service tests
- Large `constants.ts` (~500+ lines of prompt templates)
- Glossary is global, not per-project
