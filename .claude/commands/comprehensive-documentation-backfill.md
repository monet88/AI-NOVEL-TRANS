---
name: comprehensive-documentation-backfill
description: Workflow command scaffold for comprehensive-documentation-backfill in AI-NOVEL-TRANS.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /comprehensive-documentation-backfill

Use this workflow when working on **comprehensive-documentation-backfill** in `AI-NOVEL-TRANS`.

## Goal

Adds or updates extensive documentation across architecture, product, test matrix, and conventions, often in preparation for or after major features.

## Common Files

- `docs/product/*.md`
- `docs/ARCHITECTURE.md`
- `docs/TEST_MATRIX.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/templates/*.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Add or update docs/product/ files (product-overview, features, data-model, user-flows)
- Update architecture and test matrix docs (docs/ARCHITECTURE.md, docs/TEST_MATRIX.md)
- Add or enrich conventions and agent docs (AGENTS.md, CLAUDE.md, etc.)
- Add templates or decision records under docs/templates/ and docs/decisions/
- Remove obsolete plans or documentation

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.