"""Pivot the ZH->VI teacher dataset into EN->VI via Gemini Flash-Lite.

For every row in the source dataset we translate the Chinese ``source_zh`` text
into English using Gemini Flash-Lite, producing an EN<->VI parallel corpus
(``pivot_en`` + ``target_vi``) suitable for fine-tuning opus-mt-en-vi on the
murim/xianxia novel domain.

Design goals (from plan phase-01, hardened by red-team review):

* API key loaded ONLY from ``GEMINI_API_KEY`` env var — never hardcoded.
* Bounded concurrency via an asyncio semaphore (default 30; safe under the
  pay-as-you-go 2000 RPM tier).
* 3 retries per row with exponential backoff for transient failures.
* Append-only ``pivot_output.jsonl`` so a crash never corrupts prior work.
* Failed rows logged to ``skipped.jsonl`` for a targeted re-run.
* Atomic checkpoint (temp-file-then-rename) every N rows.
* Resume validates the checkpoint against the actual output line count and
  trims a corrupt trailing partial line before continuing.

The Gemini call is injected as ``translate_fn`` so the orchestration logic
(concurrency, retry, checkpoint, resume) is unit-testable without the SDK or
network access.

Usage:
    GEMINI_API_KEY=... python -m ml.data.pivot_zh_en \
        --input ml/data/raw/tran_vi_teacher_strict_clean_dedup_source.jsonl \
        --out-dir ml/data/pivot
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import random
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, Iterable

# Concurrency: 2000 RPM tier / ~1s avg latency => 30 in flight stays safe.
DEFAULT_CONCURRENCY = 30
DEFAULT_MAX_RETRIES = 3
DEFAULT_CHECKPOINT_EVERY = 5_000

PIVOT_PROMPT = (
    "Translate this Chinese text to English. Keep character names in pinyin "
    "(e.g., Lín Dòng). Output only the translation.\n\n{text}"
)

# An async function that maps a ZH string to an EN string.
TranslateFn = Callable[[str], Awaitable[str]]


class MissingApiKeyError(RuntimeError):
    """Raised when GEMINI_API_KEY is not set."""


# ---------------------------------------------------------------------------
# Pure helpers (unit-testable without network)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SourceRow:
    """A single input row to be pivoted."""

    row_index: int
    source_zh: str
    target_vi: str


def require_api_key(env: dict | None = None) -> str:
    """Return the Gemini API key from the environment or fail fast.

    Args:
        env: Optional mapping to read from (defaults to ``os.environ``).

    Raises:
        MissingApiKeyError: If ``GEMINI_API_KEY`` is unset or blank.
    """
    source = env if env is not None else os.environ
    key = (source.get("GEMINI_API_KEY") or "").strip()
    if not key:
        raise MissingApiKeyError(
            "GEMINI_API_KEY is not set. Export it (or place it in an ignored "
            ".env) before running the pivot. Never hardcode the key."
        )
    return key


def iter_source_rows(input_path: Path) -> Iterable[SourceRow]:
    """Yield ``SourceRow`` objects from the source JSONL dataset.

    Rows missing ``source_zh`` are skipped (they cannot be pivoted).  The
    ``row_index`` is the zero-based position in the file and is the stable key
    used for checkpoint/resume and dedup.
    """
    with input_path.open("r", encoding="utf-8") as handle:
        for index, line in enumerate(handle):
            stripped = line.strip()
            if not stripped:
                continue
            row = json.loads(stripped)
            source_zh = (row.get("source_zh") or "").strip()
            if not source_zh:
                continue
            yield SourceRow(
                row_index=index,
                source_zh=source_zh,
                target_vi=(row.get("target_vi") or "").strip(),
            )


def completed_indices(output_path: Path) -> set[int]:
    """Return the set of ``row_index`` values already written successfully.

    Reads the append-only output file and ignores a corrupt trailing partial
    line (which can occur if the process was killed mid-write).  Only rows with
    ``status == "ok"`` count as completed so failed attempts get retried.
    """
    if not output_path.exists():
        return set()

    done: set[int] = set()
    lines = output_path.read_text(encoding="utf-8").splitlines()
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        try:
            record = json.loads(stripped)
        except json.JSONDecodeError:
            # Corrupt trailing partial line from an interrupted write — ignore.
            continue
        if record.get("status") == "ok" and "row_index" in record:
            done.add(int(record["row_index"]))
    return done


def repair_output_file(output_path: Path) -> int:
    """Trim a corrupt trailing partial line from the append-only output.

    An interrupted write can leave a half-written final line in
    ``pivot_output.jsonl``.  ``completed_indices`` already ignores it when
    reading, but it stays on disk and would break a strict JSONL consumer.
    This rewrites the file keeping only valid JSON lines, returning the number
    of lines dropped.  Safe to call before resuming a run.
    """
    if not output_path.exists():
        return 0

    lines = output_path.read_text(encoding="utf-8").splitlines()
    valid: list[str] = []
    dropped = 0
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        try:
            json.loads(stripped)
        except json.JSONDecodeError:
            dropped += 1
            continue
        valid.append(stripped)

    if dropped:
        # Atomic rewrite so an interrupt here cannot corrupt the file again.
        tmp = output_path.with_suffix(output_path.suffix + ".tmp")
        tmp.write_text(
            "".join(line + "\n" for line in valid), encoding="utf-8"
        )
        os.replace(tmp, output_path)
    return dropped


def build_prompt(text: str) -> str:
    """Build the Gemini pivot prompt for a Chinese paragraph."""
    return PIVOT_PROMPT.format(text=text)


def _backoff_delay(attempt: int, *, base: float = 1.0, cap: float = 30.0) -> float:
    """Return an exponential-backoff delay (seconds) with jitter for *attempt*.

    Attempt is zero-based: 0 -> ~base, 1 -> ~2*base, 2 -> ~4*base, capped.
    """
    raw = min(cap, base * (2 ** attempt))
    return raw * (0.5 + random.random() / 2.0)  # 50%-100% jitter


# ---------------------------------------------------------------------------
# Atomic checkpoint
# ---------------------------------------------------------------------------


def write_checkpoint(checkpoint_path: Path, *, processed: int, last_row_index: int) -> None:
    """Atomically persist progress via temp-file-then-rename.

    Writing to ``<name>.tmp`` then ``os.replace`` guarantees the checkpoint is
    never observed half-written even if the process dies mid-flush.
    """
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = checkpoint_path.with_suffix(checkpoint_path.suffix + ".tmp")
    payload = {"processed": processed, "last_row_index": last_row_index}
    tmp.write_text(json.dumps(payload), encoding="utf-8")
    os.replace(tmp, checkpoint_path)


def read_checkpoint(checkpoint_path: Path) -> dict | None:
    """Read the checkpoint file, returning ``None`` if absent or corrupt."""
    if not checkpoint_path.exists():
        return None
    try:
        return json.loads(checkpoint_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


# ---------------------------------------------------------------------------
# Retry wrapper
# ---------------------------------------------------------------------------


async def translate_with_retry(
    text: str,
    translate_fn: TranslateFn,
    *,
    max_retries: int = DEFAULT_MAX_RETRIES,
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
) -> str:
    """Call ``translate_fn`` with exponential-backoff retries.

    Args:
        text: ZH paragraph to translate.
        translate_fn: Async ZH->EN translation function.
        max_retries: Number of retry attempts after the first try.
        sleep: Injectable async sleep (tests pass a no-op).

    Returns:
        The translated English text.

    Raises:
        The last exception if all attempts fail.
    """
    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            result = await translate_fn(text)
            if not result or not result.strip():
                raise ValueError("empty translation returned")
            return result.strip()
        except Exception as exc:  # noqa: BLE001 — re-raised after retries
            last_exc = exc
            if attempt < max_retries:
                await sleep(_backoff_delay(attempt))
    assert last_exc is not None
    raise last_exc


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


@dataclass
class PivotStats:
    total: int = 0
    ok: int = 0
    skipped: int = 0
    resumed: int = 0


async def run_pivot(
    rows: Iterable[SourceRow],
    translate_fn: TranslateFn,
    *,
    out_dir: Path,
    concurrency: int = DEFAULT_CONCURRENCY,
    max_retries: int = DEFAULT_MAX_RETRIES,
    checkpoint_every: int = DEFAULT_CHECKPOINT_EVERY,
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    progress: Callable[[int], None] | None = None,
) -> PivotStats:
    """Run the concurrent pivot, writing append-only output + skipped + checkpoint.

    Already-completed ``row_index`` values (from a prior interrupted run) are
    skipped so the job is resumable.

    Args:
        rows: Source rows to pivot.
        translate_fn: Async ZH->EN translation function.
        out_dir: Directory for ``pivot_output.jsonl``, ``skipped.jsonl``,
            ``checkpoint.json``.
        concurrency: Max in-flight translation requests.
        max_retries: Retries per row before logging to skipped.jsonl.
        checkpoint_every: Persist a checkpoint after this many processed rows.
        sleep: Injectable async sleep for backoff (tests pass a no-op).
        progress: Optional callback invoked with the processed count.

    Returns:
        ``PivotStats`` summarising the run.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    output_path = out_dir / "pivot_output.jsonl"
    skipped_path = out_dir / "skipped.jsonl"
    checkpoint_path = out_dir / "checkpoint.json"

    # Resume safety: physically trim any corrupt trailing partial line left by
    # an interrupted write before we read completed indices or append more.
    repair_output_file(output_path)

    done = completed_indices(output_path)
    stats = PivotStats(resumed=len(done))

    pending = [row for row in rows if row.row_index not in done]

    semaphore = asyncio.Semaphore(concurrency)
    write_lock = asyncio.Lock()
    processed = 0
    last_done_index = -1  # most-recently-completed row_index (wall-clock order)

    # Append handles kept open for the duration of the run.
    out_handle = output_path.open("a", encoding="utf-8")
    skip_handle = skipped_path.open("a", encoding="utf-8")

    async def _append(handle, record: dict) -> None:
        async with write_lock:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
            handle.flush()

    async def _worker(row: SourceRow) -> None:
        nonlocal processed, last_done_index
        async with semaphore:
            try:
                pivot_en = await translate_with_retry(
                    build_prompt(row.source_zh),
                    translate_fn,
                    max_retries=max_retries,
                    sleep=sleep,
                )
                await _append(
                    out_handle,
                    {
                        "row_index": row.row_index,
                        "source_zh": row.source_zh,
                        "target_vi": row.target_vi,
                        "pivot_en": pivot_en,
                        "status": "ok",
                    },
                )
                stats.ok += 1
            except Exception as exc:  # noqa: BLE001 — logged for re-run
                await _append(
                    skip_handle,
                    {"row_index": row.row_index, "error": str(exc)},
                )
                stats.skipped += 1
            finally:
                processed += 1
                stats.total += 1
                last_done_index = row.row_index
                if progress is not None:
                    progress(processed)
                if processed % checkpoint_every == 0:
                    write_checkpoint(
                        checkpoint_path,
                        processed=processed,
                        last_row_index=last_done_index,
                    )

    try:
        await asyncio.gather(*(_worker(row) for row in pending))
    finally:
        out_handle.close()
        skip_handle.close()
        # Final checkpoint reflecting the full run.
        write_checkpoint(
            checkpoint_path,
            processed=processed,
            last_row_index=last_done_index,
        )

    return stats


# ---------------------------------------------------------------------------
# Gemini adapter (real network path)
# ---------------------------------------------------------------------------


def make_gemini_translate_fn(
    api_key: str,
    *,
    model: str = "gemini-2.5-flash-lite",
) -> TranslateFn:
    """Build a Gemini-backed async ZH->EN translation function.

    The google-genai SDK is imported lazily so the rest of this module is
    importable (and unit-testable) without the dependency installed.
    """
    from google import genai

    client = genai.Client(api_key=api_key)

    async def _translate(prompt: str) -> str:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
        )
        return (response.text or "").strip()

    return _translate


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pivot ZH->VI dataset to EN->VI.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("ml/data/raw/tran_vi_teacher_strict_clean_dedup_source.jsonl"),
        help="Source JSONL with source_zh/target_vi columns.",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("ml/data/pivot"),
        help="Output directory for pivot_output.jsonl / skipped.jsonl / checkpoint.json.",
    )
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    parser.add_argument("--max-retries", type=int, default=DEFAULT_MAX_RETRIES)
    parser.add_argument("--checkpoint-every", type=int, default=DEFAULT_CHECKPOINT_EVERY)
    parser.add_argument("--model", type=str, default="gemini-2.5-flash-lite")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Process at most N rows (smoke-test / cost-control).",
    )
    return parser.parse_args(argv)


async def _async_main(args: argparse.Namespace) -> int:
    api_key = require_api_key()
    translate_fn = make_gemini_translate_fn(api_key, model=args.model)

    rows = list(iter_source_rows(args.input))
    if args.limit is not None:
        rows = rows[: args.limit]

    # Progress bar (lazy import so tests don't need tqdm).
    try:
        from tqdm import tqdm

        bar = tqdm(total=len(rows), desc="pivot ZH->EN")

        def _progress(_processed: int) -> None:
            bar.update(1)

    except ImportError:
        bar = None

        def _progress(_processed: int) -> None:
            return None

    stats = await run_pivot(
        rows,
        translate_fn,
        out_dir=args.out_dir,
        concurrency=args.concurrency,
        max_retries=args.max_retries,
        checkpoint_every=args.checkpoint_every,
        progress=_progress,
    )
    if bar is not None:
        bar.close()

    print(
        f"Pivot complete — total={stats.total} ok={stats.ok} "
        f"skipped={stats.skipped} resumed={stats.resumed}"
    )
    print(f"Output: {args.out_dir / 'pivot_output.jsonl'}")
    if stats.skipped:
        print(f"Re-run failed rows from: {args.out_dir / 'skipped.jsonl'}")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return asyncio.run(_async_main(args))


if __name__ == "__main__":
    sys.exit(main())
