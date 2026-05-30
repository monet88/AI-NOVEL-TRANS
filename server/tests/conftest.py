"""Pytest configuration for server tests."""

import sys
from pathlib import Path

# Ensure the project root (parent of server/) is on the Python path
# so that ``server`` is importable as a package.
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))
