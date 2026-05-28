---
phase: 1
title: "Architecture & DX Enhancements"
status: complete
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Architecture & DX Enhancements

## Overview
Re-architect the existing codebase for better scaling, reducing context size for AI agents, guaranteeing type safety with Zod, and making components easier to discover via structural reorganizations.

## Requirements
- Functional: State logic must behave identically to the current monolithic AppContext. 
- Non-functional: Reduce average file length (specifically `AppContext.tsx`). Strict runtime type checks for data passing.

## Architecture
- **Component Restructuring**: Group flat `./components` into logical folders (`/modals`, `/layout`, `/glossary`, `/workspace`, `/icons`) and expose them via `index.ts` barrel files.
- **Type Validation**: Introduce `Zod` in a new `schema.ts`. Migrate `types.ts` to infer types from Zod definitions (`z.infer<typeof NovelChapterSchema>`).
- **Context Splitting**: Dismantle `AppContext.tsx` into decoupled units: `UIContext` (modals, sidebar, active views), `ProjectContext` (chapters, active file handling), and `GlossaryContext` (terms, interactions).

## Related Code Files
- Create: `schema.ts`, `components/modals/index.ts`, `components/layout/index.ts`, `contexts/UIContext.tsx`, `contexts/ProjectContext.tsx`, `contexts/GlossaryContext.tsx`
- Modify: `App.tsx`, `types.ts`, all components to update import paths.
- Delete: `contexts/AppContext.tsx` (after migration).

## Implementation Steps
1. Install `zod` and rewrite core data structures in `schema.ts`.
2. Reorganize the component folder structure and establish `index.ts` barrels. Provide backwards-compatible proxy exports if necessary during transition.
3. Extract `UI` state variables from `AppContext` to `UIContext`.
4. Extract `Project` state variables to `ProjectContext`.
5. Extract `Glossary` state to `GlossaryContext`.
6. Refactor `App.tsx` and all dependent components to use the specialized contexts instead of `useAppContext`.

## Success Criteria
- [x] Zod schemas cleanly validate incoming/outgoing batch data structure.
- [x] Component directory is logically grouped.
- [x] `AppContext.tsx` is fully deprecated.
- [x] Application compiles and works without state regressions.

## Risk Assessment
- **Risk**: High refactoring surface area may break existing modals that rely on multiple pieces of state.
- **Mitigation**: Move one context slice at a time. Rely strictly on TypeScript/TSX compilation errors to track down missed dependencies.
