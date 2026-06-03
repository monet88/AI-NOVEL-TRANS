"""Tests for ml.train.seq2seq_pipeline helpers."""

from types import SimpleNamespace

import pytest  # pyright: ignore[reportMissingImports]

from ml.train.seq2seq_pipeline import (  # pyright: ignore[reportMissingImports]
    build_parallel_records,
    chunked,
    make_compute_metrics,
    read_parallel_texts,
    tokenize_parallel_batch,
)


class FakeTokenizer:
    pad_token_id = 0

    def __call__(
        self,
        texts=None,
        *,
        text_target=None,
        max_length=None,
        truncation=None,
    ):
        assert max_length is not None
        assert truncation is True
        items = texts if texts is not None else text_target or []
        return {"input_ids": [[len(text)] for text in items]}

    def batch_decode(self, sequences, skip_special_tokens=True):
        assert skip_special_tokens is True
        return [" ".join(str(token) for token in seq if token not in {0, -100}) for seq in sequences]


class TestParallelFiles:
    def test_reads_and_validates_parallel_counts(self, tmp_path):
        en = tmp_path / "train.en"
        vi = tmp_path / "train.vi"
        en.write_text("hello\nworld\n", encoding="utf-8")
        vi.write_text("xin chào\nthế giới\n", encoding="utf-8")

        en_lines, vi_lines = read_parallel_texts(en, vi)

        assert en_lines == ["hello", "world"]
        assert vi_lines == ["xin chào", "thế giới"]

    def test_mismatched_counts_raise(self, tmp_path):
        en = tmp_path / "train.en"
        vi = tmp_path / "train.vi"
        en.write_text("hello\n", encoding="utf-8")
        vi.write_text("xin chào\nthế giới\n", encoding="utf-8")

        with pytest.raises(ValueError, match="Line count mismatch"):
            read_parallel_texts(en, vi)


class TestParallelHelpers:
    def test_build_parallel_records_preserves_alignment(self):
        records = build_parallel_records(["hello", "world"], ["xin chào", "thế giới"])

        assert records == [
            {"source_text": "hello", "target_text": "xin chào"},
            {"source_text": "world", "target_text": "thế giới"},
        ]

    def test_tokenize_parallel_batch_uses_source_and_target(self):
        tokenizer = FakeTokenizer()
        batch = {
            "source_text": ["hello", "world"],
            "target_text": ["xin chào", "thế giới"],
        }

        encoded = tokenize_parallel_batch(
            batch,
            tokenizer,
            max_source_length=64,
            max_target_length=64,
        )

        assert encoded["input_ids"] == [[5], [5]]
        assert encoded["labels"] == [[8], [8]]

    def test_chunked_yields_contiguous_chunks(self):
        assert list(chunked(["a", "b", "c", "d"], 2)) == [["a", "b"], ["c", "d"]]

    def test_chunked_rejects_non_positive_size(self):
        with pytest.raises(ValueError, match="positive"):
            list(chunked(["a"], 0))


class TestComputeMetrics:
    def test_compute_metrics_returns_bleu_and_chrf(self):
        tokenizer = FakeTokenizer()

        def bleu_metric(sys, refs):
            assert sys == ["1", "2"]
            assert refs == [["1", "2"]]
            return SimpleNamespace(score=42.5)

        def chrf_metric(sys, refs):
            assert sys == ["1", "2"]
            assert refs == [["1", "2"]]
            return SimpleNamespace(score=77.7)

        compute_metrics = make_compute_metrics(
            tokenizer,
            bleu_metric=bleu_metric,
            chrf_metric=chrf_metric,
        )
        eval_pred = SimpleNamespace(
            predictions=[[1, 0, -100], [2, 0, -100]],
            label_ids=[[1, -100, 0], [2, -100, 0]],
        )

        metrics = compute_metrics(eval_pred)

        assert metrics["bleu"] == 42.5
        assert metrics["chrf"] == 77.7
        assert metrics["gen_len"] == 1.0
