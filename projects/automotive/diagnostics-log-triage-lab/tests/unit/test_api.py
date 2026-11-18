"""TC-API-*：FastAPI 薄层（DLT-13）。"""

import os

import pytest
from fastapi.testclient import TestClient

from src.api import create_app
from src.generator import generate


@pytest.fixture
def client():
    return TestClient(create_app(max_bytes=1_000_000))


@pytest.fixture(scope="module")
def trace():
    return "\n".join(generate(seed=42, scenario="dev").lines[:3000])


def test_health(client):  # TC-API-01
    r = client.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_triage_ok(client, trace):  # TC-API-02
    r = client.post("/triage", json={"trace": trace})
    assert r.status_code == 200
    body = r.json()
    assert set(body) >= {"incidents", "clusters", "parse_stats", "events"}
    assert body["incidents"] and body["parse_stats"]["total"] > 0


@pytest.mark.parametrize("payload", [{"trace": ""}, {"trace": "   \n"}, {}, {"trace": 1}])
def test_triage_empty_422(client, payload):  # TC-API-03
    assert client.post("/triage", json=payload).status_code == 422


def test_triage_invalid_json_422(client):
    r = client.post("/triage", content=b"{not json", headers={"content-type": "application/json"})
    assert r.status_code == 422


def test_triage_too_large_413(client):  # TC-API-04
    assert client.post("/triage", json={"trace": "x" * 1_200_000}).status_code == 413


def test_clusters_before_triage_404(client):  # TC-API-05
    assert client.get("/clusters").status_code == 404


def test_clusters_after_triage(client, trace):  # TC-API-06
    client.post("/triage", json={"trace": trace})
    r = client.get("/clusters")
    assert r.status_code == 200 and r.json()["clusters"]


def test_apps_do_not_share_state(trace):
    a, b = TestClient(create_app()), TestClient(create_app())
    a.post("/triage", json={"trace": trace})
    assert b.get("/clusters").status_code == 404


def test_triage_no_disk_writes(client, trace, tmp_path, monkeypatch):  # TC-API-07
    monkeypatch.chdir(tmp_path)
    client.post("/triage", json={"trace": trace})
    assert os.listdir(tmp_path) == []
