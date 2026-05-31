"""Tests for ml/data/pivot_zh_en.py orchestration (no network / no SDK).

The Gemini call is injected as ``translate_fn`` and ``asyncio.sleep`` is
replaced with a no-op so retry/backoff runs instantly.
"""

import asyncio
import json

import pytest

from ml.data.pivot_zh_en import (
    MissingApiKeyError,
    PivotStats,
    SourceRow,
    build_prompt,
    completed_indices,
    iter_source_rows,
    read_checkpoint,
    repair_output_file,
    require_api_key,
    run_pivot,
    translate_with_retry,
    write_checkpoint,
)


async def _no_sleep(_seconds: float) -> None:
    return None


def _rows(n: int) -> list[SourceRow]:
    return [
        SourceRow(row_index=i, source_zh=f"中文{i}", target_vi=f"vi{i}")
        for i in range(n)
    ]


def _read_jsonl(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


class TestRequireApiKey:
    def test_returns_key_when_set(self):
        assert require_api_key({"GEMINI_API_KEY": "abc123"}) == "abc123"

    def test_strips_whitespace(self):
        assert require_api_key({"GEMINI_API_KEY": "  k  "}) == "k"

    def test_missing_raises(self):
        with pytest.raises(MissingApiKeyError):
            require_api_key({})

    def test_blank_raises(self):
        with pytest.raises(MissingApiKeyError):
            require_api_key({"GEMINI_API_KEY": "   "})


class TestBuildPrompt:
    def test_includes_source_text(self):
        prompt = build_prompt("林动 said hi")
        assert "林动 said hi" in prompt
        assert "pinyin" in prompt


class TestIterSourceRows:
    def test_parses_rows_with_index(self, tmp_path):
        path = tmp_path / "src.jsonl"
        path.write_text(
            '{"source_zh": "中", "target_vi": "vi0"}\n'
            '{"source_zh": "国", "target_vi": "vi1"}\n',
            encoding="utf-8",
        )
        rows = list(iter_source_rows(path))
        assert [r.row_index for r in rows] == [0, 1]
        assert rows[0].source_zh == "中"
        assert rows[1].target_vi == "vi1"

    def test_skips_rows_missing_source(self, tmp_path):
        path = tmp_path / "src.jsonl"
        path.write_text(
            '{"source_zh": "中", "target_vi": "vi0"}\n'
            '{"target_vi": "vi1"}\n'  # no source_zh -> skipped
            '{"source_zh": "  ", "target_vi": "vi2"}\n'  # blank -> skipped
            '{"source_zh": "好", "target_vi": "vi3"}\n',
            encoding="utf-8",
        )
        rows = list(iter_source_rows(path))
        # Indices preserve original file position (0 and 3 survive).
        assert [r.row_index for r in rows] == [0, 3]


class TestCheckpoint:
    def test_write_then_read_roundtrip(self, tmp_path):
        cp = tmp_path / "checkpoint.json"
        write_checkpoint(cp, processed=5000, last_row_index=4999)
        data = read_checkpoint(cp)
        assert data == {"processed": 5000, "last_row_index": 4999}

    def test_atomic_no_tmp_left(self, tmp_path):
        cp = tmp_path / "checkpoint.json"
        write_checkpoint(cp, processed=1, last_row_index=0)
        assert not (tmp_path / "checkpoint.json.tmp").exists()

    def test_read_missing_returns_none(self, tmp_path):
        assert read_checkpoint(tmp_path / "nope.json") is None

    def test_read_corrupt_returns_none(self, tmp_path):
        cp = tmp_path / "checkpoint.json"
        cp.write_text("{partial", encoding="utf-8")
        assert read_checkpoint(cp) is None


class TestCompletedIndices:
    def test_empty_when_no_file(self, tmp_path):
        assert completed_indices(tmp_path / "out.jsonl") == set()

    def test_collects_ok_indices(self, tmp_path):
        out = tmp_path / "out.jsonl"
        out.write_text(
            '{"row_index": 0, "status": "ok"}\n'
            '{"row_index": 1, "status": "ok"}\n',
            encoding="utf-8",
        )
        assert completed_indices(out) == {0, 1}

    def test_ignores_non_ok_status(self, tmp_path):
        out = tmp_path / "out.jsonl"
        out.write_text(
            '{"row_index": 0, "status": "ok"}\n'
            '{"row_index": 1, "status": "error"}\n',
            encoding="utf-8",
        )
        assert completed_indices(out) == {0}

    def test_ignores_corrupt_trailing_line(self, tmp_path):
        out = tmp_path / "out.jsonl"
        out.write_text(
            '{"row_index": 0, "status": "ok"}\n'
            '{"row_index": 1, "sta',  # truncated partial write
            encoding="utf-8",
        )
        assert completed_indices(out) == {0}


class TestRepairOutputFile:
    def test_no_file_returns_zero(self, tmp_path):
        assert repair_output_file(tmp_path / "nope.jsonl") == 0

    def test_clean_file_unchanged(self, tmp_path):
        out = tmp_path / "out.jsonl"
        content = (
            '{"row_index": 0, "status": "ok"}\n'
            '{"row_index": 1, "status": "ok"}\n'
        )
        out.write_text(content, encoding="utf-8")
        dropped = repair_output_file(out)
        assert dropped == 0
        assert out.read_text(encoding="utf-8") == content

    def test_trims_corrupt_trailing_line_on_disk(self, tmp_path):
        out = tmp_path / "out.jsonl"
        out.write_text(
            '{"row_index": 0, "status": "ok"}\n'
            '{"row_index": 1, "status": "ok"}\n'
            '{"row_index": 2, "sta',  # corrupt partial
            encoding="utf-8",
        )
        dropped = repair_output_file(out)
        assert dropped == 1
        # File on disk now contains only the 2 valid lines.
        lines = out.read_text(encoding="utf-8").splitlines()
        assert len(lines) == 2
        assert all(json.loads(line)["status"] == "ok" for line in lines)
        # No temp file left behind.
        assert not (tmp_path / "out.jsonl.tmp").exists()


class TestTranslateWithRetry:
    def test_success_first_try(self):
        async def fn(_text):
            return "hello"

        result = asyncio.run(translate_with_retry("中", fn, sleep=_no_sleep))
        assert result == "hello"

    def test_retries_then_succeeds(self):
        calls = {"n": 0}

        async def flaky(_text):
            calls["n"] += 1
            if calls["n"] < 3:
                raise RuntimeError("transient")
            return "ok"

        result = asyncio.run(
            translate_with_retry("中", flaky, max_retries=3, sleep=_no_sleep)
        )
        assert result == "ok"
        assert calls["n"] == 3

    def test_empty_result_treated_as_failure(self):
        async def empty(_text):
            return "   "

        with pytest.raises(ValueError, match="empty"):
            asyncio.run(
                translate_with_retry("中", empty, max_retries=1, sleep=_no_sleep)
            )

    def test_raises_after_exhausting_retries(self):
        async def always_fail(_text):
            raise RuntimeError("boom")

        with pytest.raises(RuntimeError, match="boom"):
            asyncio.run(
                translate_with_retry("中", always_fail, max_retries=2, sleep=_no_sleep)
            )


class TestRunPivot:
    def test_all_rows_succeed(self, tmp_path):
        async def fn(prompt):
            return "EN " + prompt[-1]

        stats = asyncio.run(
            run_pivot(
                _rows(5),
                fn,
                out_dir=tmp_path,
                checkpoint_every=2,
                sleep=_no_sleep,
            )
        )
        assert isinstance(stats, PivotStats)
        assert stats.ok == 5
        assert stats.skipped == 0
        records = _read_jsonl(tmp_path / "pivot_output.jsonl")
        assert len(records) == 5
        assert all(r["status"] == "ok" for r in records)
        assert all("pivot_en" in r for r in records)

    def test_failed_rows_go_to_skipped(self, tmp_path):
        async def fn(prompt):
            # Fail for the row whose source ends in '2'.
            if prompt.rstrip().endswith("中文2"):
                raise RuntimeError("nope")
            return "EN"

        stats = asyncio.run(
            run_pivot(_rows(4), fn, out_dir=tmp_path, max_retries=1, sleep=_no_sleep)
        )
        assert stats.ok == 3
        assert stats.skipped == 1
        skipped = _read_jsonl(tmp_path / "skipped.jsonl")
        assert len(skipped) == 1
        assert skipped[0]["row_index"] == 2
        assert "error" in skipped[0]

    def test_resume_skips_completed_rows(self, tmp_path):
        # Pre-populate output as if rows 0,1 already done.
        out = tmp_path / "pivot_output.jsonl"
        out.write_text(
            '{"row_index": 0, "status": "ok", "pivot_en": "x"}\n'
            '{"row_index": 1, "status": "ok", "pivot_en": "y"}\n',
            encoding="utf-8",
        )

        translated = []

        async def fn(prompt):
            translated.append(prompt)
            return "EN"

        stats = asyncio.run(
            run_pivot(_rows(4), fn, out_dir=tmp_path, sleep=_no_sleep)
        )
        # Only rows 2 and 3 should have been translated this run.
        assert len(translated) == 2
        assert stats.ok == 2
        assert stats.resumed == 2
        # Output now has all 4 rows.
        records = _read_jsonl(out)
        assert {r["row_index"] for r in records} == {0, 1, 2, 3}

    def test_resume_repairs_corrupt_trailing_line(self, tmp_path):
        # Output has 2 good rows + a corrupt partial line from a prior crash.
        out = tmp_path / "pivot_output.jsonl"
        out.write_text(
            '{"row_index": 0, "status": "ok", "pivot_en": "x"}\n'
            '{"row_index": 1, "status": "ok", "pivot_en": "y"}\n'
            '{"row_index": 2, "status": "o',  # corrupt
            encoding="utf-8",
        )

        async def fn(_prompt):
            return "EN"

        stats = asyncio.run(
            run_pivot(_rows(4), fn, out_dir=tmp_path, sleep=_no_sleep)
        )
        # Rows 0,1 done; corrupt row 2 line trimmed so row 2 is re-processed.
        assert stats.resumed == 2
        records = _read_jsonl(out)
        assert {r["row_index"] for r in records} == {0, 1, 2, 3}
        # Exactly one record per row index — no duplicate / corrupt leftover.
        assert len(records) == 4

    def test_checkpoint_written(self, tmp_path):
        async def fn(_prompt):
            return "EN"

        asyncio.run(
            run_pivot(_rows(3), fn, out_dir=tmp_path, checkpoint_every=1, sleep=_no_sleep)
        )
        cp = read_checkpoint(tmp_path / "checkpoint.json")
        assert cp is not None
        assert cp["processed"] == 3

    def test_concurrency_is_bounded(self, tmp_path):
        in_flight = {"current": 0, "max": 0}

        async def fn(_prompt):
            in_flight["current"] += 1
            in_flight["max"] = max(in_flight["max"], in_flight["current"])
            await asyncio.sleep(0)  # yield so others can start
            in_flight["current"] -= 1
            return "EN"

        asyncio.run(
            run_pivot(_rows(20), fn, out_dir=tmp_path, concurrency=3, sleep=_no_sleep)
        )
        assert in_flight["max"] <= 3
