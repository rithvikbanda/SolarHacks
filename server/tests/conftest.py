"""
Pytest configuration and shared fixtures for backend tests.
Set required env vars before importing app so routers that check at import time (e.g. solar) don't fail.

Run tests with the server venv so FastAPI is available:
  cd /path/to/SolarHacks
  server/venv/bin/python -m pytest server/tests -v
  # or: source server/venv/bin/activate && pytest server/tests -v
"""
import os
import sys

# Repo root so "from server.utils ..." and "server.main" resolve when running pytest from repo root
_server_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_repo_root = os.path.dirname(_server_dir)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

# Set dummy API keys so routers load (tests will mock actual HTTP)
os.environ.setdefault("EIA_API_KEY", "test-key")
os.environ.setdefault("NREL_API_KEY", "test-key")
os.environ.setdefault("REWIRING_AMERICA_API_KEY", "test-key")

import pytest

try:
    from fastapi.testclient import TestClient
except ImportError as e:
    raise ImportError(
        "FastAPI not found. Run pytest with the server venv:\n"
        "  server/venv/bin/python -m pytest server/tests -v\n"
        "  or: source server/venv/bin/activate && pytest server/tests -v"
    ) from e

# Import app after path and env are set (run pytest from repo root: pytest server/tests)
from server.main import app


@pytest.fixture
def client():
    return TestClient(app)
