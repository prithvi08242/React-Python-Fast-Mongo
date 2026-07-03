import os
import requests

BASE = os.environ.get("BASE_URL", "http://localhost:8001") + "/api"
ADMIN = {"email": "admin@example.com", "password": "admin123"}


def auth_token():
    r = requests.post(f"{BASE}/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_health():
    r = requests.get(f"{BASE}/playground/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_returns_token():
    r = requests.post(f"{BASE}/auth/login", json=ADMIN)
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_invalid():
    r = requests.post(
        f"{BASE}/auth/login", json={"email": "admin@example.com", "password": "wrong"}
    )
    assert r.status_code == 401


def test_todos_pagination():
    r = requests.get(f"{BASE}/playground/todos?page=1&limit=5")
    assert r.status_code == 200
    body = r.json()
    assert {"data", "page", "limit", "total", "total_pages"} <= set(body.keys())


def test_create_todo_requires_auth():
    r = requests.post(f"{BASE}/playground/todos", json={"title": "x"})
    assert r.status_code == 401


def test_create_and_delete_todo():
    token = auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(
        f"{BASE}/playground/todos", json={"title": "pytest todo"}, headers=headers
    )
    assert r.status_code == 201
    todo_id = r.json()["id"]
    d = requests.delete(f"{BASE}/playground/todos/{todo_id}", headers=headers)
    assert d.status_code == 200


def test_status_echo():
    r = requests.get(f"{BASE}/playground/status/404")
    assert r.status_code == 404


def test_echo():
    r = requests.post(f"{BASE}/playground/echo", json={"a": 1})
    assert r.status_code == 200
    assert r.json()["you_sent"] == {"a": 1}
