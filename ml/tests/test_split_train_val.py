"""Tests for ml/data/split_train_val.py (validation + split logic)."""

import json

from ml.data.split_train_val import (
    Pair,
    cjk_ratio,
    contains_refusal,
    latin_ratio,
    split_pairs,
    validate_and_collect,
    validate_pivot_row,
    write_split,
)


class TestScriptRatios:
    def test_latin_ratio_pure_english(self):
        assert latin_ratio("Hello world") == 1.0

    def test_latin_ratio_pure_chinese(self):
        assert latin_ratio("你好世界") == 0.0

    def test_latin_ratio_no_letters(self):
        assert latin_ratio("123 !!! ...") == 0.0

    def test_cjk_ratio_pure_chinese(self):
        assert cjk_ratio("你好") == 1.0

    def test_cjk_ratio_pure_english(self):
        assert cjk_ratio("hello") == 0.0

    def test_cjk_ratio_ignores_whitespace(self):
        assert cjk_ratio("a b c") == 0.0


class TestContainsRefusal:
    def test_detects_cannot_translate(self):
        assert contains_refusal("I cannot translate this text.")

    def test_detects_as_an_ai(self):
        assert contains_refusal("As an AI, I will not...")

    def test_clean_text_not_flagged(self):
        assert not contains_refusal("The dragon king roared.")

    def test_clean_dialogue_not_flagged(self):
        assert not contains_refusal("I cannot believe how strong he was.")
        assert not contains_refusal("I'm sorry to hear that.")
        assert not contains_refusal("I can't wait to see the outcome.")
        assert not contains_refusal("I cannot help feeling nervous.")
        assert not contains_refusal("I am unable to contain my joy.")


class TestValidatePivotRow:
    def test_clean_pair_passes(self):
        # Realistic paragraph-length pair keeps len(EN)/len(ZH) within [0.3, 5.5].
        assert (
            validate_pivot_row(
                "林动深吸一口气，转身离开了山洞。",
                "Lin Dong took a deep breath and turned to leave the cave.",
            )
            is None
        )

    def test_empty_en_rejected(self):
        assert validate_pivot_row("林动", "") == "empty_en"

    def test_empty_zh_rejected(self):
        assert validate_pivot_row("", "Lin Dong") == "empty_zh"

    def test_refusal_rejected(self):
        assert validate_pivot_row("林动", "I'm sorry, I cannot do that") == "refusal"

    def test_untranslated_chinese_rejected(self):
        # EN output still mostly Chinese -> low latin / high cjk.
        assert validate_pivot_row("林动走了你好世界", "林动走了你好世界") in {
            "low_latin_ratio",
            "high_cjk_ratio",
        }

    def test_length_ratio_too_short(self):
        assert validate_pivot_row("这是一段很长的中文文本内容", "Hi") == "length_ratio_low"

    def test_length_ratio_too_long(self):
        zh = "短短短短短短短短短短"
        en = "This is an extremely long English translation " * 3
        assert validate_pivot_row(zh, en) == "length_ratio_high"

    def test_length_ratio_skipped_at_nine_chars(self):
        zh = "短短短短短短短短短"
        en = "x" * 100
        assert validate_pivot_row(zh, en) is None

    def test_short_zh_passes_length_check(self):
        assert validate_pivot_row("嗯", "He let out a soft sound of acknowledgment.") is None


class TestSplitPairs:
    def test_split_fraction(self):
        pairs = [Pair(en=f"e{i}", vi=f"v{i}") for i in range(100)]
        train, val = split_pairs(pairs, val_fraction=0.05, seed=42)
        assert len(val) == 5
        assert len(train) == 95

    def test_split_is_deterministic(self):
        pairs = [Pair(en=f"e{i}", vi=f"v{i}") for i in range(50)]
        t1, v1 = split_pairs(pairs, seed=7)
        t2, v2 = split_pairs(pairs, seed=7)
        assert [p.en for p in t1] == [p.en for p in t2]
        assert [p.en for p in v1] == [p.en for p in v2]

    def test_no_overlap_between_train_and_val(self):
        pairs = [Pair(en=f"e{i}", vi=f"v{i}") for i in range(40)]
        train, val = split_pairs(pairs, val_fraction=0.25, seed=1)
        train_set = {p.en for p in train}
        val_set = {p.en for p in val}
        assert train_set.isdisjoint(val_set)
        assert len(train_set) + len(val_set) == 40


class TestValidateAndCollect:
    def _write(self, path, records):
        with path.open("w", encoding="utf-8") as f:
            for r in records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

    def test_filters_and_logs_rejected(self, tmp_path):
        inp = tmp_path / "pivot_output.jsonl"
        rej = tmp_path / "rejected.jsonl"
        self._write(
            inp,
            [
                {"row_index": 0, "status": "ok", "source_zh": "林动深吸一口气离开了山洞", "pivot_en": "Lin Dong took a deep breath and left the cave.", "target_vi": "Lâm Động hít sâu rồi rời khỏi sơn động."},
                {"row_index": 1, "status": "ok", "source_zh": "林动转身看向远方天空", "pivot_en": "I cannot translate this please try again later", "target_vi": "x"},  # refusal
                {"row_index": 2, "status": "error", "source_zh": "x", "pivot_en": "y", "target_vi": "z"},  # not ok
                {"row_index": 3, "status": "ok", "source_zh": "好的兄弟我们走吧现在", "pivot_en": "Okay brother let us go right now", "target_vi": ""},  # empty vi
            ],
        )
        pairs = validate_and_collect(inp, rej)
        assert len(pairs) == 1
        assert pairs[0].en == "Lin Dong took a deep breath and left the cave."
        rejected = [json.loads(l) for l in rej.read_text(encoding="utf-8").splitlines() if l.strip()]
        reasons = {r["row_index"]: r["reason"] for r in rejected}
        assert reasons[1] == "refusal"
        assert reasons[3] == "empty_vi"
        # row 2 (status != ok) is silently skipped, not logged as rejected.
        assert 2 not in reasons

    def test_corrupt_json_line_logged_not_raised(self, tmp_path):
        inp = tmp_path / "pivot_output.jsonl"
        rej = tmp_path / "rejected.jsonl"
        # Valid row followed by a corrupt JSON line — must not crash.
        inp.write_text(
            '{"row_index": 0, "status": "ok", "source_zh": "林动深吸一口气离开了山洞", '
            '"pivot_en": "Lin Dong took a deep breath and left the cave.", '
            '"target_vi": "Lâm Động hít sâu rồi rời khỏi sơn động."}\n'
            '{"row_index": 1, "status": "o',
            encoding="utf-8",
        )
        pairs = validate_and_collect(inp, rej)
        assert len(pairs) == 1
        reasons = [
            json.loads(l)["reason"]
            for l in rej.read_text(encoding="utf-8").splitlines()
            if l.strip()
        ]
        assert "corrupt_json" in reasons

    def test_normalizes_multiline_to_single_line(self, tmp_path):
        inp = tmp_path / "pivot_output.jsonl"
        rej = tmp_path / "rejected.jsonl"
        self._write(
            inp,
            [
                {"row_index": 0, "status": "ok", "source_zh": "林动\n深吸一口气离开了山洞", "pivot_en": "Lin Dong took\na deep  breath and left", "target_vi": "Lâm Động\nhít sâu rồi rời đi"},
            ],
        )
        pairs = validate_and_collect(inp, rej)
        assert "\n" not in pairs[0].en
        assert "\n" not in pairs[0].vi
        assert pairs[0].en == "Lin Dong took a deep breath and left"


class TestWriteSplit:
    def test_writes_aligned_line_counts(self, tmp_path):
        pairs = [Pair(en="hello", vi="xin chào"), Pair(en="bye", vi="tạm biệt")]
        n = write_split(pairs, tmp_path / "train.en", tmp_path / "train.vi")
        assert n == 2
        en_lines = (tmp_path / "train.en").read_text(encoding="utf-8").splitlines()
        vi_lines = (tmp_path / "train.vi").read_text(encoding="utf-8").splitlines()
        assert len(en_lines) == len(vi_lines) == 2
        assert en_lines[0] == "hello"
        assert vi_lines[1] == "tạm biệt"
