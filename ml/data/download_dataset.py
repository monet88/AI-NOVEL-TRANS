"""Download the ZH->VI teacher dataset for the EN-VI pivot pipeline.

Source: ``richardadam/tran-vi-teacher-bucket`` (public HF bucket, ~350k clean,
deduplicated novel-domain ZH->VI paragraph pairs).

The dataset is a JSONL file with one object per line.  Each row has:

    {
        "source_zh": "<Chinese source paragraph>",
        "target_vi": "<Vietnamese translation>",
        "meta": {"source_dataset": ..., "model": ...}
    }

This script downloads the dedup file via the Hugging Face Hub API and verifies
the expected columns / row count.  The actual heavy download is gated behind a
real network call, but the row-validation logic is exposed as pure functions so
it can be unit-tested without network access.

Usage:
    python -m ml.data.download_dataset \
        --out ml/data/raw/tran_vi_teacher_strict_clean_dedup_source.jsonl
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Canonical dataset coordinates (see plan.md "Key Decisions").
REPO_ID = "richardadam/tran-vi-teacher-bucket"
REPO_TYPE = "dataset"
DATASET_FILENAME = "tran_vi_teacher_strict_clean_dedup_source.jsonl"

# Columns the downstream pivot script depends on.
REQUIRED_COLUMNS = ("source_zh", "target_vi")
EXPECTED_MIN_ROWS = 300_000


class DatasetValidationError(RuntimeError):
    """Raised when the downloaded dataset does not match expectations."""


def validate_row(row: dict) -> None:
    """Validate that a single dataset row has the required columns.

    Args:
        row: A parsed JSONL object.

    Raises:
        DatasetValidationError: If a required column is missing or empty.
    """
    for column in REQUIRED_COLUMNS:
        if column not in row:
            raise DatasetValidationError(
                f"row missing required column '{column}': keys={sorted(row)}"
            )
        if not isinstance(row[column], str) or not row[column].strip():
            raise DatasetValidationError(
                f"row column '{column}' must be a non-empty string"
            )


def validate_jsonl(
    path: Path,
    *,
    sample_size: int = 100,
    expected_min_rows: int = EXPECTED_MIN_ROWS,
) -> int:
    """Validate a downloaded JSONL dataset file.

    Checks the first ``sample_size`` rows for the required columns and counts
    total rows to confirm the dataset is roughly the expected size.

    Args:
        path: Path to the JSONL file.
        sample_size: Number of leading rows to schema-check.
        expected_min_rows: Minimum acceptable total row count.

    Returns:
        Total number of rows in the file.

    Raises:
        DatasetValidationError: On schema or size mismatch.
    """
    if not path.exists():
        raise DatasetValidationError(f"dataset file not found: {path}")

    total = 0
    with path.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle):
            stripped = line.strip()
            if not stripped:
                continue
            if total < sample_size:
                try:
                    row = json.loads(stripped)
                except json.JSONDecodeError as exc:
                    raise DatasetValidationError(
                        f"invalid JSON on line {line_no + 1}: {exc}"
                    ) from exc
                validate_row(row)
            total += 1

    if total < expected_min_rows:
        raise DatasetValidationError(
            f"expected >= {expected_min_rows} rows but found {total}"
        )
    return total


def download(out_path: Path, *, force: bool = False) -> Path:
    """Download the dedup dataset file from the Hugging Face Bucket.

    Args:
        out_path: Destination path for the JSONL file.
        force: Re-download even if the destination already exists.

    Returns:
        Path to the downloaded file.
    """
    import subprocess

    out_path.parent.mkdir(parents=True, exist_ok=True)

    if out_path.exists() and not force:
        print(f"Dataset already present at {out_path} (use --force to refetch).")
        return out_path

    # richardadam/tran-vi-teacher-bucket is an HF Bucket (not a dataset repo),
    # so hf_hub_download does not work — use `hf sync` CLI instead.
    bucket_url = f"hf://buckets/{REPO_ID}"
    print(f"Downloading {DATASET_FILENAME} from {bucket_url} ...")
    result = subprocess.run(
        [
            "hf", "sync",
            "--include", DATASET_FILENAME,
            bucket_url,
            str(out_path.parent),
        ],
        check=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout)
    print(f"Saved to {out_path}")
    return out_path


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download ZH->VI teacher dataset.")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("ml/data/raw") / DATASET_FILENAME,
        help="Output JSONL path.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if the file already exists.",
    )
    parser.add_argument(
        "--skip-validation",
        action="store_true",
        help="Skip post-download schema/row-count validation.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    path = download(args.out, force=args.force)
    if not args.skip_validation:
        total = validate_jsonl(path)
        print(f"Validation OK — {total} rows, columns {REQUIRED_COLUMNS} present.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
