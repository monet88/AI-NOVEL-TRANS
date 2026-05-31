"""Pytest configuration for ml/ tests."""

import sys
from pathlib import Path

# Ensure the project root (parent of ml/) is importable so ``ml.data.*``
# resolves as a package.
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))
