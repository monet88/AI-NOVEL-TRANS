# Harness

The project goal is to provide a reusable operating harness that lets humans and
agents turn a future product spec into safe, validated work.

The app is what users touch. The harness is what agents touch.

## Mental Model

```text
------------------+
| Human intent    |
+------------------+
         |
         v
+------------------+
| Feature intake   |
+------------------+
         |
         v
+------------------+
| Story packet     |
+------------------+
         |
         v
+------------------+
| Agent work loop  |
+------------------+
         |
         v
+------------------+
| Product delta    |
+------------------+
         |
         v
+------------------+
| Validation proof |
+------------------+
         |
         v
+------------------+
| Harness delta    |
+------------------+
         |
         v
+------------------+
| Next intent      |
+------------------+
```

Every task has two possible outputs:

1. Product delta: app code, tests, API shape, data model, or product docs.
2. Harness delta: docs, templates, validation expectations, backlog items, or
   decision records that make the next task easier.

## Harness v0 Scope

Harness v0 includes:

- Agent entrypoint.
- Empty product documentation structure.
- Feature intake and risk lanes.
- Story templates.
- Decision log template.
- Validation report template.
- Test matrix placeholder.
- Harness growth backlog.
- Durable layer: SQLite database and CLI for operational records.

Harness v0 deliberately excludes:

- A project-specific `SPEC.md`.
- Pre-sliced product domains.
- A locked application stack.
- App source scaffolding.
- Package scripts.
- Test runner config.
- CI workflows.

Those should arrive only when a selected story needs them.

## Durable Layer

Policy documents describe how to work. The durable layer stores what happened.

Operational data — intake classifications, story status, decision outcomes,
backlog items, and execution traces — lives in a SQLite database (`harness.db`)
managed by the Rust Harness CLI at `scripts/bin/harness-cli`. Agents and humans
should use that binary for Harness work. The database is local to each project
instance and `.gitignore`d. The schema is version-controlled under
`scripts/schema/`.

This separation keeps policy docs stable and human-readable while giving agents
a structured, queryable record of operational state. It also prepares the
harness for future observability and automated evolution without adding more
markdown files.

Initialize the database if it does not exist:

```bash
scripts/bin/harness-cli init
```

Common commands:

```bash
scripts/bin/harness-cli intake  --type <type> --summary <text> --lane <lane>
scripts/bin/harness-cli story   add --id <id> --title <text> --lane <lane>
scripts/bin/harness-cli story   update --id <id> --status <status>
scripts/bin/harness-cli trace   --summary <text> --outcome <outcome>
scripts/bin/harness-cli query   matrix
scripts/bin/harness-cli query   backlog
scripts/bin/harness-cli query   stats
```

## Source Hierarchy

```text
User-provided spec or prompt
  input material for first buildout or future changes

docs/product/*
  current product contract derived from accepted input

docs/stories/*
  story-sized work packets and historical evidence

scripts/bin/harness-cli query matrix
  behavior-to-proof control panel backed by the durable layer

docs/decisions/*
  why the contract changed
```

Before implementation, product docs describe intent. After implementation,
product docs plus executable tests become the living contract.

## Spec Lifecycle

Harness v0 starts without a tracked project spec. When the human provides a
specification, treat it as input material, not as a permanent operating manual.
Use it to populate product docs, story packets, architecture decisions, and
validation expectations during the first buildout.

After the specification has been decomposed, do not keep extending it as the
living product plan. Ongoing work should update the smaller product docs,
stories, durable proof records, and decision records.

Ongoing work should enter the harness as one of these input types:

- New spec: a project specification that needs to become product docs and
  initial story candidates.
- Spec slice: a selected behavior from the provided spec.
- Change request: a bounded behavior change, bug fix, or product refinement.
- New initiative: a larger product area that needs multiple stories.
- Maintenance request: dependency, architecture, performance, security, or
  operational work.
- Harness improvement: a process, template, proof, or agent-instruction change.

The spec-to-work loop is:

```text
human intent or supplied spec
  -> classify input type
  -> update or create product contract
  -> create story packet or initiative notes when needed
  -> define validation proof
  -> implement or document the blocker
  -> update product docs, stories, durable proof records, and decisions
  -> capture harness friction
```

Large product areas should use scoped initiative notes instead of a second
monolithic specification. An initiative should explain the goal, affected
product docs, candidate stories, validation shape, open decisions, and exit
criteria. If initiative work becomes a repeated pattern, add a template or
record the proposal with `scripts/bin/harness-cli backlog add`.

## Growth Rule

The harness grows from friction.

When an agent is confused, repeats manual reasoning, needs a new validation
command, discovers a missing rule, or sees a recurring failure pattern, it must
either improve the harness directly or record the friction:

```bash
scripts/bin/harness-cli backlog add --title "<short name>" --pain "<what was hard>"
```

The `harness_friction` field on traces also captures per-task friction so
patterns can be queried later:

```bash
scripts/bin/harness-cli query friction
```

### External Notebook / Kaggle Friction Pattern

When a task runs through an external notebook runtime such as Kaggle, record and
check these items before declaring the setup ready:

- CLI visibility is not runtime visibility. A dataset shown by `kaggle datasets`
  still must be attached with notebook **Add Input** before `/kaggle/input/...`
  exists.
- Do not assume a single mount path. Kaggle may mount datasets as
  `/kaggle/input/<slug>/...` or `/kaggle/input/datasets/<owner>/<slug>/...`.
  Runners should discover required files recursively under `/kaggle/input` and
  print the resolved path plus available inputs on failure.
- Script kernels may not import sibling files reliably. Either package the code
  explicitly or generate a self-contained runner for the kernel entrypoint.
- After generating a self-contained runner, run `python3 -m py_compile <runner>`
  before pushing so missing imports and syntax errors are caught locally.
- Separate credential failure modes: a Kaggle Secrets `HTTP Error 400` is a
  runtime secret-access failure, not proof that the provider API key is invalid.
  If a private-notebook direct-key workaround is used, document rotation after
  the run and never commit the key.
- Treat `403 Client Error: Forbidden` from `kaggle datasets status <owner>/<slug>`
  as an ambiguous dataset-access signal, not immediate proof that credentials are
  bad. First run the credential checker, then search owned datasets with
  `kaggle datasets list --mine --search <slug-or-title>`. If credentials are OK
  and the dataset is absent from `--mine`, create it from the local dataset
  directory with `kaggle datasets create -p <dataset-dir> --dir-mode zip`, then
  rerun `kaggle datasets status <owner>/<slug>` and expect `ready` before wiring
  it into a kernel `dataset_sources` entry.
- For Kaggle GPU runners, distinguish blocking errors from noisy image warnings:
  - `HF_TOKEN Kaggle Secret unavailable` or `HF_TOKEN not found` is non-blocking
    when the run can save model artifacts to Kaggle Output and Hub upload will be
    done later. Do not paste tokens into committed files; direct-token workarounds
    belong only in a private Kaggle UI copy.
  - Pip resolver warnings about unrelated preinstalled packages (`jax`, `opencv`,
    `cuml`, `kaggle-environments`, `sentence-transformers`, etc.) are usually
    non-blocking if the runner pins and imports its own training stack.
  - XLA/TensorFlow CUDA factory messages such as `Unable to register cuFFT`,
    `cuDNN`, `cuBLAS`, or `computation placer already registered` are usually
    non-blocking for PyTorch training unless followed by a traceback.
- Preserve the compatible stack decisions for Kaggle P100 runs. P100 GPUs require
  wheels that still support `sm_60`; newer PyTorch wheels can fail with
  `cudaErrorNoKernelImageForDevice`. Pin `torch==2.2.2+cu121` from the PyTorch
  CUDA 12.1 wheel index, pin `numpy<2` to avoid NumPy ABI failures, and pin the
  older Transformers stack (`transformers==4.40.2`, `datasets==2.19.2`,
  `accelerate==0.30.1`) so Marian checkpoints can load without newer
  `torch.load` CVE guards that require `torch>=2.6`.
- If `transformers.trainer_seq2seq` fails through `peft` with
  `cannot import name 'clear_device_cache' from 'accelerate.utils.memory'`, remove
  preinstalled `peft` in the runner unless the job actually uses LoRA/PEFT. Full
  MarianMT fine-tuning does not require PEFT, and newer PEFT can require newer
  Accelerate symbols than the P100-compatible pinned stack provides.

### Colab Runtime Recovery Pattern

When a task runs through Google Colab, treat `/content` as disposable and verify
Drive visibility before blaming missing project files:

- If Drive web still shows files but Colab sees empty `code/` or `data/`, assume a
  stale `/content/drive` mount first. Hard-remount with `drive.flush_and_unmount()`,
  remove the local `/content/drive` mountpoint, then `drive.mount('/content/drive',
  force_remount=True)`.
- After mounting, print the resolved workspace path plus the sorted `code/` and
  `data/` file lists. Do not proceed until Colab sees the same required files as
  Drive web.
- Runtime packages under `/content`, such as `/content/ai-novel-trans-runtime`,
  disappear after reconnect/reset. Setup, training, and eval cells should recreate
  the runtime package from Drive before calling `os.chdir(RUNTIME_ROOT)`.
- Dependency checks should be per required module, not a single sentinel package.
  A runtime can have `transformers` installed but still miss `sacrebleu` or
  `sacremoses`.
- For current Transformers versions, `Seq2SeqTrainer(...)` uses
  `processing_class=tokenizer`; keep `DataCollatorForSeq2Seq(tokenizer=...)` as-is
  because that argument remains valid.
- Long Colab evaluations can exceed tool timeouts. If the notebook output reached
  `Runtime ready` and started streaming evaluation logs, the runtime-recovery
  error is fixed; continue monitoring the notebook output instead of rerunning the
  setup blindly.

## Agent Operating Rules

Agents must treat Harness as the durable operating loop for every meaningful task.
The chat transcript is not the source of truth; the repository docs plus Harness
CLI records are.

### When Durable Records Are Required

Create or update durable records for any task that does one or more of these:

- fixes a bug or validates a bug as non-reproducible
- changes product behavior, process, validation, docs, plans, or operational steps
- finalizes a technical or product decision
- discovers repeated friction, missing proof, stale docs, or a reusable lesson
- changes external runtime behavior such as Colab, Kaggle, Hugging Face, or provider setup
- takes more than a trivial read-only answer

Skip durable records only for pure read-only answers or tiny conversational replies
with no repository, process, validation, or operational change.

### 1. Intake Before Work

Classify the request with `docs/FEATURE_INTAKE.md`, then record the intake before
meaningful work starts:

```bash
scripts/harness intake \
  --type "Maintenance request" \
  --summary "Short task summary" \
  --lane normal \
  --flags "Existing behavior,Weak proof" \
  --docs "docs/HARNESS.md,docs/FEATURE_INTAKE.md" \
  --notes "Context notes"
```

Lane defaults:

- `tiny`: narrow docs, copy, naming, or low-risk mechanical edits
- `normal`: bugfix, feature slice, process update, notebook/runtime work, bounded behavior change
- `high-risk`: auth, authorization, data loss, migrations, audit/security, external provider behavior, public contracts, or multi-domain changes

Also query current proof and process pain early:

```bash
scripts/harness query matrix
scripts/harness query backlog
```

### 2. Story For Trackable Work

Create a story when the work has acceptance criteria, validation proof, a durable
status, or future follow-up value. Do not create a story for tiny read-only chat.

```bash
scripts/harness story add \
  --id "OPS-SHORT-ID" \
  --title "Human readable title" \
  --lane normal \
  --contract "What should be true after this work" \
  --notes "Extra context"
```

After validation, update story evidence. Proof flags are numeric `0` or `1`, not
`yes` or `no`:

```bash
scripts/harness story update \
  --id "OPS-SHORT-ID" \
  --status implemented \
  --unit 0 \
  --integration 0 \
  --e2e 0 \
  --platform 1 \
  --evidence "What proof exists"
```

### 3. Backlog For Repeated Friction

When a task exposes a repeated failure pattern, missing template, stale rule,
manual recovery step, or out-of-scope improvement, add backlog instead of leaving
it in chat only:

```bash
scripts/harness backlog add \
  --title "Reusable Colab runtime recovery checklist" \
  --while "Phase 2 Colab debugging" \
  --pain "What was hard/repeated/ambiguous" \
  --suggestion "What should be added or improved" \
  --risk normal \
  --predicted "Expected benefit"
```

### 4. Decisions Need Decision Records

If a decision affects architecture, validation policy, source-of-truth hierarchy,
external providers, security, data durability, or future implementation direction,
record it as a decision. A trace field is not enough.

Required for durable decisions:

- markdown decision under `docs/decisions/`
- durable decision row when using the CLI decision workflow
- trace `--decisions` may summarize the decision, but it does not replace the decision log

Current CLI command shape matters: `story update` proof flags use `0/1`, and
`story verify <id>` only runs configured verification commands.

### 5. Trace After Work

Every meaningful task ends with a trace. Normal-lane work needs at least a
standard trace: intake/story when available, actions, files read, files changed,
outcome, errors, and friction.

```bash
scripts/harness trace \
  --summary "What was completed" \
  --intake 2 \
  --story "OPS-SHORT-ID" \
  --agent claude-code \
  --outcome completed \
  --actions "read docs,updated files,ran validation" \
  --read "docs/HARNESS.md,scripts/harness query matrix" \
  --changed "docs/HARNESS.md,harness.db" \
  --decisions "kept update path as --merge" \
  --errors "none" \
  --friction "none"
```

Use `docs/TRACE_SPEC.md` for the required tier:

- `tiny`: minimal, or standard if Harness/docs changed
- `normal`: standard
- `high-risk`: detailed

### 6. Query Before Final Response

Before reporting done, verify durable state and proof:

```bash
scripts/harness query stats
scripts/harness query matrix
scripts/harness query backlog
scripts/harness query decisions
scripts/harness query traces
scripts/harness query friction
```

Use only the queries relevant to the task, but always verify records that were
created or updated.

### 7. Update Harness From Upstream

Use merge mode to preserve local project customizations:

```bash
curl -fsSL "https://raw.githubusercontent.com/hoangnb24/repository-harness/main/scripts/install-harness.sh?$(date +%s)" \
  | bash -s -- --merge --yes
```

Then run:

```bash
scripts/harness migrate
scripts/harness query stats
git diff --check
```

If `--merge` skips an existing `scripts/bin/harness-cli`, update the binary from
the latest GitHub release asset with checksum verification, or use an overwrite
mode only when backup/replace is intended.

## Task Loop

For every task:

1. Classify the request with `docs/FEATURE_INTAKE.md`.
2. Record the classification with `scripts/bin/harness-cli intake`.
3. Locate the affected product docs and story files.
4. Check proof status with `scripts/bin/harness-cli query matrix`.
5. Work only inside the selected lane: tiny, normal, or high-risk.
6. Before finishing, ask whether product truth, validation expectations,
   architecture rules, repeated failure patterns, or next-agent instructions
   changed.
7. Record a trace with `scripts/bin/harness-cli trace`, using
   `docs/TRACE_SPEC.md` for the expected trace tier and field depth.
8. If harness friction was found, either fix it directly or record it with
   `scripts/bin/harness-cli backlog add`.

## Harness Change Policy

Agents may update directly:

- Story status and evidence via `scripts/bin/harness-cli story update`.
- Test matrix rows via `scripts/bin/harness-cli story add` and
  `scripts/bin/harness-cli story update`.
- Links from story packets to product docs.
- Validation notes and reports.
- Small clarifications tied to the current task.
- Intake records, traces, and backlog items via `scripts/bin/harness-cli`.

Agents should ask for human confirmation before:

- Changing architecture direction.
- Removing validation requirements.
- Changing the source-of-truth hierarchy.
- Changing risk classification rules.
- Replacing the feature workflow.

## Done Definition

A task is done only when:

- The requested change is completed or the blocker is documented.
- Relevant docs, stories, and test matrix entries remain current.
- Validation commands were run when they exist.
- A trace has been recorded with `scripts/bin/harness-cli trace`.
- Missing harness capabilities were recorded with
  `scripts/bin/harness-cli backlog add`.
- The final response says what changed and what was not attempted.

## Future Validation Ladder

No validation scripts exist yet. When implementation begins, the expected ladder
is:

```text
validate:quick
  format, lint, typecheck, unit tests, architecture check

test:integration
  backend, database, provider, or service checks as the stack requires

test:e2e
  user-visible end-to-end flows

test:platform
  shell, mobile, desktop, or deployment smoke checks as the stack requires

test:release
  full suite, log checks, and performance smoke
```

Agents must not claim these commands pass until they exist and have been run.
