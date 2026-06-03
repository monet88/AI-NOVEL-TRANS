# Agent Instructions

Always reponse in Vietnamese

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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **AI-NOVEL-TRANS** (2970 symbols, 4721 relationships, 131 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/AI-NOVEL-TRANS/context` | Codebase overview, check index freshness |
| `gitnexus://repo/AI-NOVEL-TRANS/clusters` | All functional areas |
| `gitnexus://repo/AI-NOVEL-TRANS/processes` | All execution flows |
| `gitnexus://repo/AI-NOVEL-TRANS/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
