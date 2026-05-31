"""Tests for ml/data/download_dataset.py (validation logic, no network)."""

import json

import pytest

from ml.data.download_dataset import (
    DatasetValidationError,
    validate_jsonl,
    validate_row,
)


class TestValidateRow:
    def test_valid_row_passes(self):
        validate_row({"source_zh": "你好", "target_vi": "xin chào", "meta": {}})

    def test_missing_source_zh_raises(self):
        with pytest.raises(DatasetValidationError, match="source_zh"):
            validate_row({"target_vi": "xin chào"})

    def test_missing_target_vi_raises(self):
        with pytest.raises(DatasetValidationError, match="target_vi"):
            validate_row({"source_zh": "你好"})

    def test_empty_column_raises(self):
        with pytest.raises(DatasetValidationError, match="non-empty"):
            validate_row({"source_zh": "   ", "target_vi": "xin chào"})

    def test_non_string_column_raises(self):
        with pytest.raises(DatasetValidationError, match="non-empty"):
            validate_row({"source_zh": 123, "target_vi": "xin chào"})


class TestValidateJsonl:
    def _write_jsonl(self, path, rows):
        with path.open("w", encoding="utf-8") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")

    def test_counts_rows_and_passes(self, tmp_path):
        path = tmp_path / "data.jsonl"
        rows = [{"source_zh": f"中{i}", "target_vi": f"vi{i}"} for i in range(10)]
        self._write_jsonl(path, rows)
        total = validate_jsonl(path, sample_size=5, expected_min_rows=10)
        assert total == 10

    def test_blank_lines_ignored(self, tmp_path):
        path = tmp_path / "data.jsonl"
        path.write_text(
            '{"source_zh": "中", "target_vi": "vi"}\n\n'
            '{"source_zh": "国", "target_vi": "v2"}\n',
            encoding="utf-8",
        )
        total = validate_jsonl(path, sample_size=5, expected_min_rows=2)
        assert total == 2

    def test_too_few_rows_raises(self, tmp_path):
        path = tmp_path / "data.jsonl"
        self._write_jsonl(path, [{"source_zh": "中", "target_vi": "vi"}])
        with pytest.raises(DatasetValidationError, match=">= 100"):
            validate_jsonl(path, sample_size=1, expected_min_rows=100)

    def test_missing_file_raises(self, tmp_path):
        with pytest.raises(DatasetValidationError, match="not found"):
            validate_jsonl(tmp_path / "nope.jsonl")

    def test_bad_json_in_sample_raises(self, tmp_path):
        path = tmp_path / "data.jsonl"
        path.write_text("{not valid json\n", encoding="utf-8")
        with pytest.raises(DatasetValidationError, match="invalid JSON"):
            validate_jsonl(path, sample_size=5, expected_min_rows=1)
