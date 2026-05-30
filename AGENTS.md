# Agent Instructions

## Project: AI Novel Weaver

Browser-based translation workbench for long-form fiction (EN→VI). Uses LLM
providers (Gemini, OpenAI, DeepSeek) with genre-aware prompts for wuxia,
xianxia, and modern urban novels.

## Quick Reference

| Item | Value |
|------|-------|
| Stack | React 19 + Vite 6 + TypeScript 5.8 |
| Styling | Tailwind CSS (CDN) |
| Persistence | IndexedDB (`idb`) |
| Validation | Zod 4 |
| State | React Context (no external lib) |
| Entry | `index.tsx` → `App.tsx` |
| Build | `npm run dev` / `npm run build` |
| Tests | None installed yet |

## File Structure

```
/ (flat root, no src/)
├── schema.ts, types.ts    — Data contracts (Zod source of truth)
├── constants.ts           — Genre prompt templates
├── services/              — Business logic (provider-agnostic)
├── hooks/                 — React hooks (bridge to services)
├── contexts/              — Shared state (Project, UI, Glossary)
├── components/            — UI (layout/, workspace/, modals/, glossary/, icons/)
└── docs/, plans/, scripts/ — Harness infrastructure
```

## Conventions

- Flat layout: no `src/` directory, all source at root
- Types inferred from Zod schemas (`z.infer<>`)
- AI providers abstracted behind `services/aiService.ts` facade
- Components import from contexts/hooks, never from services directly
- No router — view state in ProjectContext (`dashboard` | `workspace`)
- Modals controlled via UIContext boolean flags
- Glossary is global (shared across projects)

## Key Files for Common Tasks

| Task | Start here |
|------|-----------|
| Add AI provider | `services/api/` + `services/aiService.ts` |
| Modify data model | `schema.ts` → `types.ts` |
| Add UI feature | `components/` + relevant Context |
| Change persistence | `services/persistenceService.ts` |
| Modify translation prompts | `constants.ts` |
| Add export format | `services/exportService.ts` |
| Batch processing logic | `services/batchOrchestrator.ts` |

## Product Docs

- `docs/product/product-overview.md` — what the app does
- `docs/product/features.md` — feature inventory
- `docs/product/data-model.md` — entities and storage
- `docs/product/user-flows.md` — user journeys

<!-- HARNESS:BEGIN -->
## Harness

This repo uses Harness. Before work, read:

- `README.md`
- `docs/HARNESS.md`
- `docs/FEATURE_INTAKE.md`
- `docs/ARCHITECTURE.md`
- `docs/CONTEXT_RULES.md`
- `scripts/harness query matrix`

Use the Rust Harness CLI as the main operational tool. Run it through the
stable repo-local entrypoint `scripts/harness`, which uses the prebuilt Rust
binary at `scripts/bin/harness-cli` in installed projects.
<!-- HARNESS:END -->
