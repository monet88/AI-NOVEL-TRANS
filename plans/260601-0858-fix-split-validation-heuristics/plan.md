# Fix Phase 1 Pivot Validation Heuristics

**Status:** done  
**Priority:** P1  
**Effort:** ~1h  

## Rationale

Two heuristics in `ml/data/split_train_val.py` produce false rejects on valid novel-translation pairs:

1. **Length ratio** uses raw character counts (`len(en) / len(zh)`). ZH single-char or very short entries (exclamations, names) produce proportionally longer EN, easily exceeding the `4.0` ceiling. The check is only meaningful on paragraph-length ZH (≥ 10 chars).

2. **Refusal patterns** include overly broad phrases (`"i cannot"`, `"i can't"`, `"i'm sorry"`, `"i am sorry"`) that collide with common novel dialogue ("I cannot believe...", "I'm sorry to hear..."). These must be replaced with translation-refusal-specific patterns.

Existing behaviour for empty/malformed/untranslated rows (`empty_en`, `empty_zh`, `empty_vi`, `corrupt_json`, `low_latin_ratio`, `high_cjk_ratio`) is **unchanged**.

---

## Ordered TODOs

### 1 — `ml/data/split_train_val.py`

- [ ] **Add `MIN_ZH_LEN = 10`** constant near the other threshold constants.
- [ ] **Guard the length-ratio block** with `if len(zh) >= MIN_ZH_LEN:` in `validate_pivot_row` (keep the two length-ratio return branches inside the guard). Short ZH rows still run the Latin/CJK checks.
- [ ] **Replace `REFUSAL_PATTERNS`** — remove broad patterns, keep/add specific ones:

  ```python
  REFUSAL_PATTERNS = (
      "as an ai",                  # LLM self-identification (keep)
      "cannot translate",          # Explicit translation refusal (keep)
      "i cannot translate",        # More explicit form (add)
      "i cannot assist",           # LLM refusal phrasing (add)
      "i cannot help",             # LLM refusal phrasing (add)
      "i'm unable to translate",   # Explicit (add)
      "i am unable to translate",  # Explicit (add)
      "i'm sorry, i cannot",       # Apology+refusal combo (replaces bare "i'm sorry")
      "i am sorry, i cannot",      # Apology+refusal combo (replaces bare "i am sorry")
      "i am unable",               # Keep — rare in literary prose
      "i'm unable",                # Keep — rare in literary prose
      # Removed: "i cannot", "i can't", "i'm sorry", "i am sorry"
  )
  ```

### 2 — `ml/tests/test_split_train_val.py`

- [ ] **Fix `test_length_ratio_too_long`** — `zh = "短"` (1 char) is now below `MIN_ZH_LEN` so the ratio check is skipped. Update to `zh = "短短短短短短短短短短"` (10 chars); ratio still far exceeds `4.0`.
- [ ] **Update `test_detects_i_cannot`** — "I cannot translate this." passes via `"cannot translate"`; rename the test to `test_detects_cannot_translate` and change the input to make intent clear.
- [ ] **Add `test_clean_dialogue_not_flagged`** in `TestContainsRefusal`:
  ```python
  assert not contains_refusal("I cannot believe how strong he was.")
  assert not contains_refusal("I'm sorry to hear that.")
  assert not contains_refusal("I can't wait to see the outcome.")
  ```
- [ ] **Add `test_short_zh_passes_length_check`** in `TestValidatePivotRow`:
  ```python
  # 1-char ZH with proportionally long EN — ratio ~14, would have been rejected
  assert validate_pivot_row("嗯", "He let out a soft sound of acknowledgment.") is None
  ```

### 3 — `plans/260529-2312-en-vi-offline-mt-pipeline/phase-01-data-preparation.md`

- [ ] In **Step 3 (Validate pivot output)**, update the bullet points to reflect:
  - Length ratio check only applies when `len(ZH) >= 10` chars.
  - Refusal patterns are now translation-specific (not bare "I cannot" / "I'm sorry").

---

## Preserved Behaviour

| Scenario | Current result | After fix |
|---|---|---|
| `empty_en` / `empty_zh` | rejected | unchanged |
| `empty_vi` | rejected | unchanged |
| `corrupt_json` | logged | unchanged |
| Low latin / high CJK | rejected | unchanged |
| Short ZH (< 10 chars), correct EN | **false reject** (length_ratio_high) | passes |
| Novel dialogue: "I cannot believe..." | **false reject** (refusal) | passes |
| Actual LLM refusal: "I cannot translate..." | rejected | rejected (via "cannot translate") |
| Actual LLM refusal: "I'm sorry, I cannot do that" | rejected | rejected (via "i'm sorry, i cannot") |

---

## Files to Modify

- `ml/data/split_train_val.py` — constants + guard
- `ml/tests/test_split_train_val.py` — fix 1 test, add 2 tests
- `plans/260529-2312-en-vi-offline-mt-pipeline/phase-01-data-preparation.md` — doc note

## No Other Changes

No new files, no new abstractions, no changes to `split_pairs`, `write_split`, `validate_and_collect`, or `main`.
