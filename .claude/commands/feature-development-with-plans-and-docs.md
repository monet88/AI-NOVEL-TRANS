---
name: feature-development-with-plans-and-docs
description: Workflow command scaffold for feature-development-with-plans-and-docs in AI-NOVEL-TRANS.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-development-with-plans-and-docs

Use this workflow when working on **feature-development-with-plans-and-docs** in `AI-NOVEL-TRANS`.

## Goal

Implements a new feature or integration, accompanied by planning documents and updates to product documentation.

## Common Files

- `plans/{feature}/phase-*.md`
- `plans/{feature}/plan.md`
- `plans/reports/*{feature}*.md`
- `docs/product/*.md`
- `docs/ARCHITECTURE.md`
- `components/**/*.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update detailed plan documents under plans/{feature}/ (phases, plan.md)
- Implement feature across relevant code files (e.g., components/, services/, server/)
- Update product documentation (docs/product/, docs/ARCHITECTURE.md, etc.)
- Add or update tests (e.g., hooks/*.test.ts, services/*.test.ts, server/tests/)
- Update package files or configuration as needed (e.g., package.json, requirements.txt)

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.