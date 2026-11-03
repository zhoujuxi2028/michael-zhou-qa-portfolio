import os
from pathlib import Path

import psycopg
import pytest

# OrbStack socket for local development
os.environ.setdefault(
    "DOCKER_HOST", "unix:///Users/michaelzhou/.orbstack/run/docker.sock"
)
os.environ.setdefault(
    "TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE",
    "/Users/michaelzhou/.orbstack/run/docker.sock",
)
os.environ.setdefault("TESTCONTAINERS_HOST_OVERRIDE", "localhost")

SRC = Path(__file__).parent.parent / "src"
USE_EXTERNAL_DB = os.environ.get("USE_EXTERNAL_DB") == "true"


def _get_ci_dsn():
    return (
        f"postgresql://{os.environ['DB_USER']}:{os.environ['DB_PASSWORD']}"
        f"@{os.environ['DB_HOST']}:{os.environ['DB_PORT']}/{os.environ['DB_NAME']}"
    )


@pytest.fixture(scope="session")
def pg_container():
    if USE_EXTERNAL_DB:
        yield None
        return
    from testcontainers.community.postgres import PostgresContainer

    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg


@pytest.fixture(scope="session")
def db_dsn(pg_container):
    if USE_EXTERNAL_DB:
        return _get_ci_dsn()
    return pg_container.get_connection_url().replace(
        "postgresql+psycopg2://", "postgresql://"
    )


@pytest.fixture(scope="session")
def db_conn(db_dsn):
    """Session-scoped connection; schema + seed + procedures loaded once."""
    with psycopg.connect(db_dsn, autocommit=False) as conn:
        with conn.cursor() as cur:
            cur.execute((SRC / "schema.sql").read_text())
            cur.execute((SRC / "seed.sql").read_text())
            cur.execute((SRC / "procedures.sql").read_text())
        conn.commit()
        yield conn


@pytest.fixture
def cur(db_conn):
    """Function-scoped cursor with automatic rollback — each test is isolated."""
    with db_conn.cursor() as cursor:
        yield cursor
    db_conn.rollback()
