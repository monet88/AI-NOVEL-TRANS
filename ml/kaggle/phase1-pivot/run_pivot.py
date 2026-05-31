"""Kaggle runner for Phase 1 — Pivot ZH→EN via Gemini Flash-Lite.

Input:  /kaggle/input/en-vi-novel-mt-raw/tran_vi_teacher_strict_clean_dedup_source.jsonl
Output: /kaggle/working/pivot/pivot_output.jsonl
        /kaggle/working/pivot/skipped.jsonl (if any)
        /kaggle/working/pivot/checkpoint.json

GEMINI_API_KEY must be added as a Kaggle Secret (label: GEMINI_API_KEY).
"""

import subprocess
import sys
import os
from pathlib import Path

# Install dependencies
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q",
    "google-genai>=1.0.0",
    "tqdm>=4.66.0",
])

# Load GEMINI_API_KEY from Kaggle Secrets
from kaggle_secrets import UserSecretsClient  # noqa: E402
secrets = UserSecretsClient()
os.environ["GEMINI_API_KEY"] = secrets.get_secret("GEMINI_API_KEY")

# Paths
INPUT_JSONL = Path("/kaggle/input/en-vi-novel-mt-raw/tran_vi_teacher_strict_clean_dedup_source.jsonl")
OUT_DIR = Path("/kaggle/working/pivot")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# pivot_zh_en.py must be in the same directory as this script (copied before push)
sys.path.insert(0, str(Path(__file__).parent))
from pivot_zh_en import main  # noqa: E402

sys.exit(main([
    "--input", str(INPUT_JSONL),
    "--out-dir", str(OUT_DIR),
    "--concurrency", "30",
]))
