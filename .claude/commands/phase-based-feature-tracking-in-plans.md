---
name: phase-based-feature-tracking-in-plans
description: Workflow command scaffold for phase-based-feature-tracking-in-plans in AI-NOVEL-TRANS.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /phase-based-feature-tracking-in-plans

Use this workflow when working on **phase-based-feature-tracking-in-plans** in `AI-NOVEL-TRANS`.

## Goal

Tracks and updates the progress of multi-phase features using structured plan files and phase completion marking.

## Common Files

- `plans/{feature}/phase-*.md`
- `plans/{feature}/plan.md`
- `plans/reports/*{feature}*.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update plans/{feature}/phase-*.md for each phase
- Update plans/{feature}/plan.md to reflect current status and completed phases
- Mark phases as complete in plan docs as implementation progresses
- Optionally, add a report to plans/reports/ summarizing the phase or feature

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.