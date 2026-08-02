import os
import subprocess
import sys
from pathlib import Path

import pytest
from testcontainers.postgres import PostgresContainer

BACKEND_DIR = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def postgres_url():
    """Spin up a real, throwaway Postgres in Docker for the whole test session.

    Same image family as prod (postgres:16-alpine vs. Neon's managed 16), so
    we're testing against real Postgres behavior — real ILIKE semantics, real
    CHECK constraints, real UUID columns — not sqlite standing in for it.
    """
    with PostgresContainer("postgres:16-alpine") as pg:
        url = pg.get_connection_url()  # postgresql+psycopg2://test:test@localhost:<port>/test

        os.environ["DATABASE_URL"] = url
        os.environ["APP_PASSWORD"] = "test-password"
        os.environ["SECRET_KEY"] = "test-secret-key"
        os.environ["ALLOWED_ORIGINS"] = "http://localhost:5173"

        # Run the exact same command the Dockerfile's CMD runs on boot —
        # this test suite is also our migration smoke test.
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=BACKEND_DIR,
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, f"alembic upgrade head failed:\n{result.stderr}"

        yield url


@pytest.fixture()
def client(postgres_url):
    # Imported lazily, inside the fixture, so `app.config.Settings()` only
    # ever reads DATABASE_URL/APP_PASSWORD/SECRET_KEY *after* postgres_url
    # has set them. If this were a top-of-file import instead, pytest's
    # collection phase would trigger it before any fixture runs, and
    # Settings() would blow up on a missing DATABASE_URL.
    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _clean_jobs_table(client):
    """Truncate between tests so each test starts from an empty table,
    without paying container-startup cost more than once per session."""
    from sqlalchemy import text
    from app.database import engine

    yield
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE jobs RESTART IDENTITY CASCADE"))


@pytest.fixture()
def auth_headers(client):
    resp = client.post("/api/auth/login", json={"password": os.environ["APP_PASSWORD"]})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
