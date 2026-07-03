"""Backend API tests for Practice Ground app.
Covers: auth (register/login/me/logout), todos CRUD w/ auth, misc playground
endpoints (health, status echo, delay, flaky, echo, users).
"""

import os
import time
import uuid
import pytest
import requests

BASE_URL = (
    os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
    if os.environ.get("REACT_APP_BACKEND_URL")
    else None
)
if BASE_URL is None:
    # Fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")

API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "admin123")


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(
        f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- Health ---
def test_health(s):
    r = s.get(f"{API}/playground/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "time" in data


# --- Auth ---
def test_admin_login(s):
    r = s.post(
        f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    assert data["user"]["role"] == "admin"


def test_login_wrong_password(s):
    unique_email = f"nouser+{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/login", json={"email": unique_email, "password": "wrong"})
    assert r.status_code == 401


def test_register_and_me(s):
    email = f"sdet+{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(
        f"{API}/auth/register",
        json={"email": email, "password": "test1234", "name": "SDET User"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    tok = body["access_token"]
    assert body["user"]["email"] == email

    # duplicate register
    r2 = s.post(
        f"{API}/auth/register",
        json={"email": email, "password": "test1234", "name": "SDET User"},
    )
    assert r2.status_code == 400

    # /auth/me
    r3 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r3.status_code == 200
    assert r3.json()["user"]["email"] == email


def test_me_without_token(s):
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


# --- Todos CRUD ---
def test_todos_requires_auth(s):
    r = requests.post(f"{API}/playground/todos", json={"title": "no auth"})
    assert r.status_code == 401


def test_todos_crud(auth_headers):
    # Create
    r = requests.post(
        f"{API}/playground/todos",
        json={"title": "TEST_todo_1", "priority": "high"},
        headers=auth_headers,
    )
    assert r.status_code == 201, r.text
    todo = r.json()
    assert todo["title"] == "TEST_todo_1"
    assert todo["priority"] == "high"
    assert todo["completed"] is False
    tid = todo["id"]

    # Get
    r = requests.get(f"{API}/playground/todos/{tid}")
    assert r.status_code == 200
    assert r.json()["id"] == tid

    # List paginated shape
    r = requests.get(f"{API}/playground/todos?page=1&limit=5")
    assert r.status_code == 200
    body = r.json()
    for k in ("data", "page", "limit", "total", "total_pages"):
        assert k in body
    assert isinstance(body["data"], list)

    # Search filter
    r = requests.get(f"{API}/playground/todos?search=TEST_todo_1")
    assert r.status_code == 200
    assert any(t["id"] == tid for t in r.json()["data"])

    # Completed filter (should exclude our new todo)
    r = requests.get(f"{API}/playground/todos?completed=true")
    assert r.status_code == 200
    assert all(t["completed"] is True for t in r.json()["data"])

    # Update
    r = requests.put(
        f"{API}/playground/todos/{tid}",
        json={"title": "TEST_todo_1_updated", "completed": True, "priority": "low"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json()["title"] == "TEST_todo_1_updated"
    assert r.json()["completed"] is True

    # Verify persisted
    r = requests.get(f"{API}/playground/todos/{tid}")
    assert r.json()["completed"] is True

    # Delete
    r = requests.delete(f"{API}/playground/todos/{tid}", headers=auth_headers)
    assert r.status_code == 200

    # 404 after delete
    r = requests.get(f"{API}/playground/todos/{tid}")
    assert r.status_code == 404


def test_todo_missing_id():
    r = requests.get(f"{API}/playground/todos/does-not-exist")
    assert r.status_code == 404


# --- Misc playground ---
def test_status_echo():
    for code in (200, 201, 404, 418, 500):
        r = requests.get(f"{API}/playground/status/{code}")
        assert r.status_code == code
        assert r.json()["status_code"] == code


def test_delay():
    t0 = time.time()
    r = requests.get(f"{API}/playground/delay/2")
    elapsed = time.time() - t0
    assert r.status_code == 200
    assert elapsed >= 1.8
    assert r.json()["delayed"] == 2


def test_flaky():
    r = requests.get(f"{API}/playground/flaky")
    assert r.status_code in (200, 500)


def test_echo():
    payload = {"foo": "bar", "n": 42}
    r = requests.post(f"{API}/playground/echo", json=payload)
    assert r.status_code == 200
    assert r.json()["you_sent"] == payload


def test_sample_users():
    r = requests.get(f"{API}/playground/users")
    assert r.status_code == 200
    users = r.json()["users"]
    assert len(users) == 4
