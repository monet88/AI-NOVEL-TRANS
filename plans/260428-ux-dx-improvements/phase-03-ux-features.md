---
phase: 3
title: "Core UX Features"
status: completed
priority: P2
effort: "6h"
dependencies: [1]
---

# Phase 3: Core UX Features (Context Syncing & Smart Glossary)

## Overview
Supercharge the translation experience for humans by implementing side-by-side synchronized context scrolling/highlighting and interactive glossary pre-scanning logic.

## Requirements
- Functional: Clicking a sentence on the translation side highlights the associated source sentence (and vice-versa). Preemptively ask users for glossary decisions *before* completing batch translations.
- Non-functional: Highlighting should feel instant and not cause layout shift.

## Architecture
- **Side-by-Side Sync**: Embed unique data-attributes (`data-sentence-id` or robust string indexing matching) in the rendering of both `TranslationWorkspace` panels. Use a dedicated `hover`/`active` React state to cross-highlight matching IDs.
- **Interactive Glossary**: Redesign the orchestration of `BatchExtractModal` + `aiService`:
  1. AI rapidly parses raw text for Nouns/Entities.
  2. Presents finding to user -> User confirms/edits names.
  3. *Then* trigger the Batch translation utilizing these confirmed directives. 

## Related Code Files
- Modify: `components/TranslationWorkspace.tsx`, `components/BatchExtractModal.tsx`, `components/BatchTranslateModal.tsx`, `services/aiService.ts`, `services/batchOrchestrator.ts`

## Implementation Steps
1. Refactor raw-text rendering inside `TranslationWorkspace.tsx` to optionally tokenize output into recognizable sentence/paragraph blocks, ensuring cross-referential parity.
2. Implement mouseenter/mouseleave/click listeners on these tokens to dispatch an active index to `UIContext` (or local state), causing paired highlighting.
3. In `batchOrchestrator.ts`, separate the job pipeline: Introduce a `Pre-Scan Phase` querying the AI specifically for Named Entity Recognition (NER).
4. Build `InteractiveGlossaryApproval.tsx` screen inside the Batch extract flow to intercept the terms before the prose API is fired.
5. Dispatch user-approved glossary terms into the subsequent Translation AI prompt.

## Success Criteria
- [x] Highlighting a translated sentence visually reveals the target source text sentence simultaneously.
- [x] Batch extraction prompts the user with new detected glossary terms *first* before running the long translation task.

## Risk Assessment
- **Risk**: Sentence tokenization might misalign if the AI merges sentences or if punctuation structures differ severely between Languages (e.g. English vs Chinese).
- **Mitigation**: Fall back to Paragraph-block-level highlighting if strict sentence-level matching confidence drops, to ensure it doesn't highlight incorrect content.
