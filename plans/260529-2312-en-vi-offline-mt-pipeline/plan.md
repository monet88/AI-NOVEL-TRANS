---
title: "EN-VI Offline MT Pipeline"
description: "Build offline EN→VI translation for murim/xianxia novels using fine-tuned opus-mt-en-vi + CTranslate2, integrated into existing React web app via FastAPI backend"
status: in-progress
priority: P1
branch: "feat/phase1-en-vi-data-pivot"
tags: [ml, nmt, fastapi, ctranslate2, opus-mt]
blockedBy: []
blocks: []
created: "2026-05-29T16:13:50.461Z"
createdBy: "ck:plan"
source: skill
---

# EN-VI Offline MT Pipeline

## Overview

Build an offline EN→VI machine translation pipeline for murim/võ hiệp + xianxia novel domain. Fine-tune Helsinki-NLP/opus-mt-en-vi on ~350k pivoted pairs from richardadam/tran-vi-teacher-bucket. Deploy via CTranslate2 INT8 (~60 tok/s CPU) behind FastAPI. Glossary handled via best-effort known-variant post-processing plus optional hybrid LLM polish.

Execution mode for this run: CLI-first, agent-executed. Claude executes all steps directly via Kaggle CLI, Hugging Face CLI, Python scripts, and local shell commands. User only provides approvals for long-running/cost-bearing operations when prompted.

Operational note: ưu tiên chạy trực tiếp bằng CLI để tối ưu tốc độ. Chỉ dùng skill (`kaggle`, `hf-cli`, v.v.) khi gặp bước đặc thù/khó hoặc cần workflow chuyên biệt.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Base model | Helsinki-NLP/opus-mt-en-vi (pretrained, ~74M params) |
| Dataset | richardadam/tran-vi-teacher-bucket (350k ZH→VI, public, no gating, dedup) + Gemini pivot ZH→EN |
| Tokenizer | Keep Helsinki original (~60k vocab), no modifications |
| Glossary | Best-effort post-processing at app layer + hybrid LLM polish; deterministic replacement only when known variants are present |
| Runtime | CTranslate2 INT8, ~60 tok/s CPU |
| Backend | FastAPI + CTranslate2 runtime |
| Translation modes | Pure Offline + Hybrid MT→LLM |
| Train env | Kaggle (T4 16GB VRAM, 30h/week GPU quota) |
| Domain | Murim/Võ hiệp + xianxia |
| Demo | HF Space (Gradio) + web app integration |
| Execution ownership | Claude executes all CLI/script steps; user approves long-running/cost-bearing operations |

## Phases

| Phase | Name | Status | Effort | Env |
|-------|------|--------|--------|-----|
| 1 | [Data Pivot](./phase-01-data-preparation.md) | Done | 4-6h | Kaggle + Local |
| 2 | [Fine-tune](./phase-02-model-training.md) | Ready / Next | 2-3h | Kaggle T4 |
| 3 | [Export + Deploy](./phase-03-ctranslate2-export.md) | Pending | 30min | Local |
| 4 | [FastAPI Backend](./phase-04-fastapi-backend.md) | Done | 4-6h | Local |
| 5 | [Web App Integration](./phase-05-web-app-integration.md) | Done | 4-6h | Local |
| 6 | [Demo and Testing](./phase-06-demo-and-testing.md) | Pending | 4-6h | Local + HF |

## Total Estimates

- **Time:** ~6-10h (ML pipeline) + ~12h (app integration)
- **Cost:** ~$3.50 (Gemini pivot only)
- **Hardware:** Kaggle T4 (16GB VRAM) for training, CPU for inference
- **Parallelism:** Hybrid execution for Phase 4 + 5 after Phase 3 — run additive UI work in parallel, but gate merge/final integration on Phase 4 health + API stability

## ML Pipeline (3 steps)

```
Step 1: PIVOT (~4-6h, ~$3.50)
  Input:  richardadam/tran-vi-teacher-bucket (347k ZH→VI, clean, dedup)
  Action: Gemini Flash-Lite dịch ZH→EN concurrent
  Output: 345,819 pivot rows + 1,440 skipped; 345,441 validated EN↔VI pairs

Step 2: FINE-TUNE (~2-3h, $0)
  Input:  347k EN→VI + opus-mt-en-vi pretrained
  Output: Model fine-tuned cho murim/novel domain

Step 3: EXPORT (~30min, $0)
  Export: CTranslate2 INT8
  Deploy: HuggingFace Hub + Space (Gradio)
```

## Glossary Strategy (Best-effort Post-processing)

```
Runtime:
1. PRE: Scan EN input → match glossary terms (`input`, `translation`, `matchType`)
2. TRANSLATE: Send full EN text through model
3. POST: Replace known VI variants / known-bad translations when present
4. FALLBACK: If the model used an unknown phrase, keep MT output and rely on hybrid LLM polish or user glossary refinement

Reality: Post-processing cannot reliably locate an arbitrary model translation without alignment.
Benefits: No retraining needed, glossary = per-novel JSON refined by user over chapters.
```

## Dependencies

- richardadam/tran-vi-teacher-bucket (347k ZH→VI, public bucket, dedup JSONL)
- Gemini Flash-Lite API key (~$3.50 budget)
- Kaggle account (T4 GPU, 30h/week quota) for training
- HuggingFace account (model hosting + Spaces demo)

## Risk Summary

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Pivot EN quality (translationese) | Medium | Murim/xianxia EN is mostly translated from ZH anyway |
| Kaggle T4 OOM (16GB VRAM) | Low | Batch size 16 + fp16 with plenty of headroom |
| Post-processing glossary misses context | Medium | Known-pair replace (longest-match-first); hybrid mode LLM handles nuance |
| 347k insufficient for fine-tuning | Low | Pretrained model already knows EN→VI; 347k is domain adaptation only |

## Validation Log

### Session 1 — 2026-05-30
**Trigger:** `/ck:plan validate --hard`
**Questions asked:** 8

#### Verification Results
- **Tier:** Full (6 phases → all 4 roles)
- **Claims checked:** 18
- **Verified:** 16 | **Failed:** 1 | **Unverified:** 1

##### Failures
1. [Fact Checker] Phase 1: "columns: ZH source + VI translation" — FAILED. Actual columns: `id`, `source`, `target`, `source_zh`, `target_vi`, `meta` → Fixed in phase-01.

##### Unverified
1. [Flow Tracer] Phase 5 Hybrid mode client→LLM flow — logic sound but untested (new code)

#### Questions & Answers

1. **[Architecture]** Dataset column names — actual columns verified?
   - Options: Know exact names (Recommended) | Need verify | Change dataset
   - **Answer:** User provided screenshot: `source_zh`, `target_vi`, `meta` (dict with `source_dataset`, `model`)
   - **Rationale:** Plan Phase 1 used vague "ZH source + VI translation"; fixed to exact column names.

2. **[Architecture]** Gemini model for pivot: Flash-Lite vs Flash?
   - Options: Flash-Lite ~$3.50 (Recommended) | Flash ~$7-10 | Mix
   - **Answer:** Not explicitly answered → keeping Flash-Lite (Recommended)
   - **Rationale:** Cost-effective; dataset is for domain adaptation, not quality-critical.

3. **[Assumptions]** `types.ts` re-exports from `schema.ts`?
   - Options: Yes, only update schema.ts (Recommended) | Need check | Agent verify
   - **Answer:** Agent verified: `types.ts` imports all schemas from `./schema` and re-exports via `z.infer<>`. CONFIRMED.
   - **Rationale:** Phase 5 only needs to modify `schema.ts`; `types.ts` auto-inherits.

4. **[Tradeoffs]** Post-processing glossary: simple replace or context-aware?
   - Options: Simple replace V1 (Recommended) | Context window | Skip glossary
   - **Answer:** Simple replace
   - **Rationale:** Hybrid mode LLM handles edge cases; V1 keeps complexity low.

5. **[Risk]** Training environment — RTX 2060S vs Kaggle?
   - Options: 512 tokens (Recommended) | 256 | No truncation | Test first
   - **Answer:** User already updated plan to Kaggle T4 (16GB VRAM). Max sequence length question deferred to implementation.
   - **Rationale:** Kaggle T4 has 16GB VRAM — batch size 16 fits easily without gradient accumulation.

6. **[Scope]** HF Spaces demo: keep or defer?
   - Options: Keep (Recommended) | Drop | Move to Phase 6
   - **Answer:** Keep
   - **Rationale:** Useful for public sharing/testing.

7. **[Architecture]** Hybrid mode LLM polish: client-side or server-side?
   - Options: Client-side (Recommended) | Server-side | Both
   - **Answer:** Both (client-side + server-side)
   - **Rationale:** Client-side reuses existing API keys; server-side needed for headless/batch use.
   - **Impact:** Phase 4 needs `/api/translate/hybrid` endpoint. Phase 5 needs `localMtHybridTarget` setting.

8. **[Assumptions]** Gemini API tier for pivot concurrency?
   - Options: Pay-as-you-go (2000 RPM) | Free (15 RPM) | Handle both (Recommended)
   - **Answer:** Pay-as-you-go
   - **Rationale:** 2000 RPM allows 50+ concurrent requests, 347k pivot in ~4-6h feasible.

#### Confirmed Decisions
- Dataset columns: `source_zh` (ZH), `target_vi` (VI) — Phase 1 updated
- Glossary: simple deterministic replace for V1 — no change needed
- Hybrid mode: both client and server-side — Phases 4 & 5 updated
- Gemini tier: pay-as-you-go — Phase 1 concurrency updated to 50+
- HF Spaces demo: keep in Phase 3
- Training env: Kaggle T4 (already updated by user)

#### Action Items
- [x] Fix Phase 1 column names (`source_zh`, `target_vi`)
- [x] Fix Phase 1 concurrency (50+ for pay-as-you-go)
- [x] Add `/api/translate/hybrid` to Phase 4
- [x] Update Phase 5 hybrid mode: both client + server
- [x] Add `localMtHybridTarget` field to Phase 5 schema changes
- [x] Fix plan.md risk table: RTX 2060S → Kaggle T4

#### Impact on Phases
- Phase 1: Column names fixed, concurrency increased
- Phase 4: New `/api/translate/hybrid` endpoint added
- Phase 5: Hybrid architecture expanded (client + server), new schema field

### Session 2 — 2026-05-30
**Trigger:** `/ck:plan validate` (post user-edits)
**Questions asked:** 4

#### Questions & Answers

1. **[Resilience]** Phase 1: Retry policy for failed pivot rows?
   - Options: 3 retries + log skipped (Recommended) | 5 retries + fail hard | 3 retries + skip silent
   - **Answer:** 3 retries + log skipped
   - **Rationale:** Exponential backoff handles transient rate limits; `skipped.jsonl` enables targeted re-run without re-processing 347k rows.

2. **[Correctness]** Phase 4: Glossary substring collision handling?
   - Options: Longest-match-first (Recommended) | Exact word boundary | User-defined priority
   - **Answer:** Longest-match-first
   - **Rationale:** Sort by EN term length descending before replacing — "dragon king" matched before "dragon". Simple, deterministic, no regex overhead.

3. **[UX]** Phase 5: Hybrid mode LLM polish failure behavior?
   - Options: Fallback to raw MT (Recommended) | Retry then fail | Auto-switch to server-side
   - **Answer:** Fallback to raw MT
   - **Rationale:** User still gets usable output; warning badge communicates degraded quality without blocking workflow.

4. **[Scope]** Phase 2: Wandb logging for training metrics?
   - Options: Console + final checkpoint only | Wandb integration
   - **Answer:** Console + final checkpoint only
   - **Rationale:** KISS — single Kaggle run, metrics visible in notebook output. No external dependency needed.

#### Confirmed Decisions
- Retry: 3 retries + exponential backoff, failed rows → `skipped.jsonl`
- Glossary: longest-match-first (sort by EN term length descending)
- LLM failure: fallback to raw MT + warning badge
- Training logging: console only, no wandb

#### Action Items
- [x] Phase 1: Add retry policy + `skipped.jsonl` to implementation steps and risk table
- [x] Phase 4: Clarify longest-match-first sort in glossary post-processor
- [x] Phase 5: Add fallback behavior to hybrid mode steps + risk table
- [ ] Phase 2: No change needed (already console-only, confirmed)

#### Impact on Phases
- Phase 1: Retry policy specified, `skipped.jsonl` output added
- Phase 4: Glossary sort order explicitly documented
- Phase 5: Fallback UX defined for LLM failure

### Whole-Plan Consistency Sweep (Session 2)
- Files reread: plan.md, phase-01, phase-02, phase-03, phase-04, phase-05, phase-06
- Decision deltas checked: 4
- New specifications added: 3 (retry policy, glossary sort, fallback UX)
- Unresolved contradictions: 0

### Red-Team Review — 2026-05-30
**Trigger:** `/ck:plan red-team`
**Findings:** 18 total (3 Critical, 7 High, 7 Medium, 5 Low)
**Verdict:** PASS_WITH_CONDITIONS

#### Critical Fixes Applied
| ID | Issue | Resolution |
|----|-------|-----------|
| C1 | Glossary can't locate model's VI translation | Redesigned to known-pair replace (user provides both EN+VI; no alignment needed) |
| C2 | No pivot output validation | Added Step 3: fasttext lang detect + length ratio + CJK% + refusal filter |
| C3 | API key in request body | Moved to `Authorization` header; server env fallback |
| H6 | Concurrency 50 > 2000 RPM | Fixed semaphore to 30 |

#### High Fixes Applied
| ID | Issue | Resolution |
|----|-------|-----------|
| H2 | Unbounded batch size | Added max_batch_size=50, max_text_length=5000 to requirements |

#### Accepted Risks (Not Fixed)
| ID | Issue | Rationale |
|----|-------|-----------|
| H1 | Epoch-level checkpoints on Kaggle | Training is 2-3h; Kaggle sessions last 12h. Risk is low. |
| H3 | No dedup on pivot output | Dataset is already deduplicated upstream; pivot adds EN column only |
| H4 | Glossary VI-side collision | Known-pair replace eliminates this — we don't scan VI for unknown terms |
| H5 | Regex injection in glossary | Will use `re.escape()` in implementation — noted for Phase 4 |
| H7 | `extractGlossaryTerms` missing for local-mt | Will handle in Phase 5 implementation — disable extraction for local-mt |
| M1-M7 | Various medium issues | Addressed during implementation as needed |
| L1-L5 | Various low issues | Deferred to post-MVP iteration |

#### Whole-Plan Consistency Sweep (Post Red-Team)
- Files reread: plan.md, phase-01, phase-04, phase-05
- Fixes applied: 5 (C1, C2, C3, H2, H6)
- Stale references fixed: 1 (concurrency "50+" → "30" in plan.md)
- Unresolved contradictions: 0

### Session 3 — 2026-05-30
**Trigger:** `/ck:plan validate` (new session)
**Questions asked:** 8

#### Verification Results
- **Codebase scouted:** `services/api/{gemini,openai,deepseek}.ts` confirmed multi-provider system
- **Gemini tier:** Pay-as-you-go confirmed (2000 RPM), plan concurrency 30 is correct
- **Provider integration:** Additive — new `services/api/local-mt.ts` follows existing pattern

#### Questions & Answers

1. **[Infra]** Gemini Flash-Lite API tier for 350k pivot?
   - **Answer:** Pay-as-you-go (2000 RPM). Plan's concurrency 30 is correct.

2. **[Quality]** BLEU minimum threshold?
   - **Answer:** BLEU ≥ 30 bắt buộc. Không ship nếu dưới ngưỡng.

3. **[Security]** Hybrid mode API key flow?
   - **Answer:** Cả hai: BYO key via Authorization header + server env fallback.

4. **[Architecture]** Web app provider system?
   - **Answer:** Verified — app đã có multi-provider (`services/api/{gemini,openai,deepseek}.ts`). Phase 5 = additive.

5. **[Correctness]** Glossary partial match handling?
   - **Answer:** User thêm biến thể manual vào glossary (LLM extract per chapter → accumulate). Server dùng simple longest-match-first + word boundary trên EN side.

6. **[UX]** Hybrid fallback behavior?
   - **Answer:** Fallback raw MT + warning badge + user manual retry button.

7. **[Tooling]** CT2 converter tool?
   - **Answer:** Cần verify `ct2-opus-mt-converter` vs `ct2-transformers-converter` — thêm verification step vào Phase 3.

8. **[Scope]** Gradio demo vs FastAPI?
   - **Answer:** Làm lần lượt: local FastAPI trước, Gradio demo sau. Timeline ASAP, parallel Phase 4+5.

#### Confirmed Decisions
- Gemini tier: pay-as-you-go, concurrency 30 — no change needed
- BLEU ≥ 30: hard requirement, retry until met
- API key: dual mode (header + env fallback) — already in plan
- Provider: additive integration into existing multi-provider system
- Glossary: LLM extract → user refine → accumulate per novel. Server = simple replace
- Glossary matching: longest-match-first + word boundary on EN side (regex `\b`)
- Fallback: raw MT + warning + manual retry button
- CT2 converter: add verification step before committing to tool choice
- Deployment: local FastAPI first → Gradio demo second (sequential)
- Timeline: ASAP, parallel Phase 4+5 after Phase 3

#### Action Items
- [x] Phase 3: Add step to verify converter tool (`ct2-opus-mt-converter` vs `ct2-transformers-converter`)
- [x] Phase 4: Add word boundary (`\b`) to EN-side glossary matching logic
- [x] Phase 5: Add manual retry button to hybrid fallback UX
- [x] Plan: Note parallel execution of Phase 4+5 after Phase 3

#### Impact on Phases
- Phase 3: New verification step for converter tool selection
- Phase 4: Glossary matching refined (word boundary on EN side)
- Phase 5: Fallback UX enhanced (manual retry button added)

#### Whole-Plan Consistency Sweep (Session 3)
- Files reread: plan.md, phase-01, phase-03, phase-04, phase-05
- Action items applied: 4/4
- Inconsistency fixed: Phase 4 glossary docstring aligned with implementation steps (word boundary)
- Concurrency: 30 consistent across plan.md and phase-01
- Parallel note: Phase 4+5 parallel noted in plan.md Total Estimates; dependency chain preserved (Phase 5 tests need Phase 4 server)
- Unresolved contradictions: 0

### Red-Team Review — Session 2 — 2026-05-30
**Trigger:** `/ck:plan red-team` after validation Session 3
**Raw findings:** 37 from 4 hostile reviewers
**Deduped findings:** 20 groups
**Accepted/applied:** 15 groups
**Rejected/deferred:** 5 groups
**Verdict:** PASS_WITH_CONDITIONS after applied mitigations

#### Accepted Findings Applied
| # | Finding | Severity | Applied To |
|---|---------|----------|------------|
| 1 | Dataset name contradiction (`ngocdang83` vs `richardadam`) | Critical | plan.md |
| 2 | `local-mt` crashes `extractGlossaryTerms` by falling through to Gemini | Critical | Phase 5 |
| 3 | Provider enum change has more consumers than `aiService.ts` | High | Phase 5 |
| 4 | Glossary request shape mismatch; `matchType` ignored | High | Phase 4, Phase 5 |
| 5 | Glossary algorithm overstated deterministic replacement | High | plan.md, Phase 4 |
| 6 | Gemini API key handling missing for pivot script | Critical | Phase 1 |
| 7 | HuggingFace token handling missing | Medium | Phase 2, Phase 3 |
| 8 | Pivot checkpoint/resume underspecified | High | Phase 1 |
| 9 | FastAPI validation enforcement missing | High | Phase 4 |
| 10 | Hybrid LLM polish timeout missing | High | Phase 4, Phase 5 |
| 11 | FastAPI rate/concurrency guard missing | Medium | Phase 4 |
| 12 | CORS production story missing | High | Phase 4 |
| 13 | CT2 converter primary path wrong | High | Phase 3 |
| 14 | Tokenizer assumption too loose (raw SentencePiece) | Medium | Phase 3, Phase 4 |
| 15 | Full validation benchmark unrealistic in 3-4h | Medium | Phase 6 |

#### Rejected / Deferred Findings
| Finding | Rationale |
|---------|-----------|
| Drop server-side hybrid | User explicitly chose both client-side and server-side; mitigated key/logging risk instead |
| Drop Gradio demo | User explicitly chose local first, then Gradio; keep as secondary sequential target |
| Merge `/api/translate` and `/api/translate/batch` | Optional simplification; not a blocker |
| Train from scratch immediately | Keep as fallback only if BLEU < 30; fine-tuning remains faster MVP path |
| HF Spaces free tier memory as blocker | Mitigated with single-user limits and warning; not a blocker |

#### Applied Plan Changes
- Canonical dataset standardized to `richardadam/tran-vi-teacher-bucket`
- Glossary renamed from deterministic force-replace to best-effort known-variant post-processing
- Phase 1 now specifies env key loading and atomic checkpoint/resume format
- Phase 2 now specifies Kaggle Secrets/HF token handling, epoch-aligned checkpointing, and BLEU fallback path
- Phase 3 now uses `ct2-transformers-converter --model_type marian` as primary path and adds HF Spaces memory limits
- Phase 4 rewritten with Pydantic validators, CORS env allowlist, key logging protections, timeout/rate guards, tokenizer requirements, and best-effort glossary contract
- Phase 5 rewritten with full provider consumer surface, local-mt extraction behavior, health preflight, settings migration, glossary mapping, and hybrid timeout fallback
- Phase 6 revised to use 500-1000 pair benchmark subset plus optional full benchmark background/manual run

#### Whole-Plan Consistency Sweep (Red-Team Session 2)
- Files reread/updated: plan.md, phase-01, phase-02, phase-03, phase-04, phase-05, phase-06
- Decision deltas checked: 15 accepted findings
- Reconciled stale active references: 5
  - Canonical dataset: `richardadam/tran-vi-teacher-bucket`
  - Converter: `ct2-transformers-converter --model_type marian` primary
  - Glossary: best-effort known-variant post-processing, not guaranteed force-replace
  - Tokenizer: HuggingFace MarianTokenizer/exact preprocessing, not raw SentencePiece-only
  - Benchmark: 500-1000 subset for fast loop; full 17k benchmark manual/background before shipping
- Historical references retained only inside validation/red-team logs as evidence of prior decisions/finding names
- Phase effort consistency fixed: Phase 6 `4-6h` in plan table and phase frontmatter
- Unresolved contradictions: 0

### Session 4 — 2026-05-30
**Trigger:** `/ck:plan validate` (final decision lock)
**Questions asked:** 5

#### Questions & Answers

1. **[Quality Gate]** Pre-ship benchmark requirement?
   - **Answer:** BLEU ≥ 30 + full validation benchmark (~17k pairs) bắt buộc trước khi ship.

2. **[Architecture]** Hybrid target default?
   - **Answer:** Default `client-side` polish.

3. **[UX]** LLM polish failure behavior?
   - **Answer:** Fallback raw MT + warning + manual retry.

4. **[Release]** HuggingFace model visibility?
   - **Answer:** Push private trước, chỉ public sau khi pass quality gate.

5. **[Execution]** Phase 4/5 sequencing?
   - **Answer:** Hybrid approach — parallel additive work, nhưng gate merge/final integration khi Phase 4 health + API ổn định.

#### Confirmed Decisions
- Full benchmark 17k + BLEU ≥ 30 là hard release gate.
- `localMtHybridTarget` default = `client`.
- Fallback polish giữ raw MT + warning + manual retry.
- HF Hub publish policy: private-first, public-after-gate.
- Execution strategy: partial parallel with integration gate on backend readiness.

#### Action Items
- [x] Phase 3: add private-first HF publish policy + public-after-gate condition
- [x] Phase 5: set explicit default for `localMtHybridTarget=client`
- [x] Phase 6: promote full benchmark from optional to mandatory release gate
- [x] plan.md: update parallelism note to hybrid parallel with merge gate

#### Whole-Plan Consistency Sweep (Session 4)
- Files reread/updated: plan.md, phase-03, phase-05, phase-06
- Decision deltas checked: 5
- Unresolved contradictions: 0
