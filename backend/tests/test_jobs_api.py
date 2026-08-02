import datetime

SAMPLE_JOB = {
    "company": "Acme Corp",
    "position": "Senior Backend Engineer",
    "industry": "Fintech",
    "salary_min": 150000,
    "salary_max": 180000,
    "status": "Applied",
    "date_applied": "2026-07-01",
    "date_last_updated": "2026-07-01",
    "source": "LinkedIn",
    "preferred": True,
    "notes": "Referred by a friend",
}


# ---------- auth ----------

def test_login_wrong_password_rejected(client):
    resp = client.post("/api/auth/login", json={"password": "nope"})
    assert resp.status_code == 401


def test_login_correct_password_returns_token(client):
    resp = client.post("/api/auth/login", json={"password": "test-password"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_jobs_endpoint_requires_auth(client):
    resp = client.get("/api/jobs")
    assert resp.status_code == 401

    resp = client.get("/api/jobs", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401


# ---------- CRUD ----------

def test_create_and_get_job(client, auth_headers):
    create_resp = client.post("/api/jobs", json=SAMPLE_JOB, headers=auth_headers)
    assert create_resp.status_code == 201, create_resp.text
    created = create_resp.json()
    assert created["company"] == "Acme Corp"
    assert created["status"] == "Applied"
    assert created["preferred"] is True

    get_resp = client.get(f"/api/jobs/{created['id']}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == created["id"]


def test_get_missing_job_is_404(client, auth_headers):
    resp = client.get("/api/jobs/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert resp.status_code == 404


def test_update_job(client, auth_headers):
    created = client.post("/api/jobs", json=SAMPLE_JOB, headers=auth_headers).json()

    update_resp = client.put(
        f"/api/jobs/{created['id']}",
        json={"status": "Interview", "date_last_updated": "2026-07-15"},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["status"] == "Interview"
    assert updated["date_last_updated"] == "2026-07-15"
    # Fields not included in the PATCH-style update should be untouched.
    assert updated["company"] == "Acme Corp"


def test_delete_job(client, auth_headers):
    created = client.post("/api/jobs", json=SAMPLE_JOB, headers=auth_headers).json()

    delete_resp = client.delete(f"/api/jobs/{created['id']}", headers=auth_headers)
    assert delete_resp.status_code == 204

    get_resp = client.get(f"/api/jobs/{created['id']}", headers=auth_headers)
    assert get_resp.status_code == 404


# ---------- filtering — regression test for the enum values_callable fix ----------

def test_filter_by_status_matches_display_value(client, auth_headers):
    """Regression test: without `values_callable` on the status column,
    SQLAlchemy stores enum MEMBER NAMES ("applied") while the API sends
    display VALUES ("Applied"), so this filter would silently return
    zero rows even though a matching job exists.
    """
    client.post("/api/jobs", json=SAMPLE_JOB, headers=auth_headers)
    client.post("/api/jobs", json={**SAMPLE_JOB, "company": "Other Co", "status": "Rejected"}, headers=auth_headers)

    resp = client.get("/api/jobs", params={"status_filter": "Applied"}, headers=auth_headers)
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["company"] == "Acme Corp"


def test_search_matches_company_or_position(client, auth_headers):
    client.post("/api/jobs", json=SAMPLE_JOB, headers=auth_headers)
    resp = client.get("/api/jobs", params={"search": "acme"}, headers=auth_headers)
    assert len(resp.json()) == 1
    resp = client.get("/api/jobs", params={"search": "nonexistent"}, headers=auth_headers)
    assert len(resp.json()) == 0


# ---------- computed fields ----------

def test_computed_fields_for_active_job(client, auth_headers):
    today = datetime.date.today()
    applied = (today - datetime.timedelta(days=20)).isoformat()
    updated = (today - datetime.timedelta(days=16)).isoformat()

    created = client.post(
        "/api/jobs",
        json={**SAMPLE_JOB, "status": "Applied", "date_applied": applied, "date_last_updated": updated},
        headers=auth_headers,
    ).json()

    assert created["days_since_update"] == 16
    assert created["total_days"] == 20
    assert created["is_stale"] is True  # >= 14 days since update, non-terminal


def test_computed_fields_freeze_for_terminal_status(client, auth_headers):
    applied = "2026-01-01"
    updated = "2026-01-10"  # rejected 9 days after applying

    created = client.post(
        "/api/jobs",
        json={**SAMPLE_JOB, "status": "Rejected", "date_applied": applied, "date_last_updated": updated},
        headers=auth_headers,
    ).json()

    # total_days should freeze at the rejection date, not keep counting to today.
    assert created["total_days"] == 9
    # Terminal statuses are never "stale" — there's nothing pending to update.
    assert created["is_stale"] is False


# ---------- CSV export / import ----------

def test_csv_export_import_roundtrip(client, auth_headers):
    client.post("/api/jobs", json=SAMPLE_JOB, headers=auth_headers)

    export_resp = client.get("/api/jobs/export", headers=auth_headers)
    assert export_resp.status_code == 200
    csv_body = export_resp.text
    assert "Acme Corp" in csv_body

    # Wipe and reimport from the exported CSV — should come back identical in substance.
    created = client.get("/api/jobs", headers=auth_headers).json()[0]
    client.delete(f"/api/jobs/{created['id']}", headers=auth_headers)
    assert client.get("/api/jobs", headers=auth_headers).json() == []

    import_resp = client.post(
        "/api/jobs/import",
        files={"file": ("jobs.csv", csv_body, "text/csv")},
        headers=auth_headers,
    )
    assert import_resp.status_code == 200
    assert import_resp.json()["imported"] == 1

    rows = client.get("/api/jobs", headers=auth_headers).json()
    assert len(rows) == 1
    assert rows[0]["company"] == "Acme Corp"
    assert rows[0]["salary_min"] == 150000
    assert rows[0]["preferred"] is True
