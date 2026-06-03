# Harness Backlog

Use this file when an agent discovers a missing harness capability but should
not change the operating model immediately.

## Template

```md
## Missing Harness Capability

### Title

Short name.

### Discovered While

Task or story that exposed the gap.

### Current Pain

What was hard, repeated, ambiguous, or unsafe?

### Suggested Improvement

What should be added or changed?

### Risk

Tiny, normal, or high-risk.

### Status

proposed | accepted | implemented | rejected
```

## Items

## Reusable Colab Runtime Recovery Checklist

### Discovered While

Phase 2 Colab fine-tune/evaluation debugging.

### Current Pain

Colab reconnect/reset repeatedly removed `/content` runtime state, and stale
Drive mounts made `code/` and `data/` appear empty even when Google Drive web
still showed the files. Dependency checks also missed partial installs such as
“`transformers` exists but `sacrebleu` is missing”.

### Suggested Improvement

Add a reusable Colab setup/eval checklist or template cell that hard-remounts
Drive, verifies required `code`/`data`/model files, recreates the runtime package,
compile-checks copied code, installs missing dependencies per module, and only
then starts training or evaluation.

### Risk

normal

### Status

proposed

