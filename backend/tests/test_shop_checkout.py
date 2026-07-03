"""Tests for enhanced Checkout & Order Confirmation:
- POST /api/shop/orders with shipping_country/state/method
- GET /api/shop/orders/{id} (auth-scoped)
"""

import os
import pytest
import requests


def _read_frontend_env():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return None


BASE_URL = (
    os.environ.get("REACT_APP_BACKEND_URL") or _read_frontend_env() or ""
).rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"

DEFAULT_USER = {"email": "tester@practiceground.dev", "password": "Test@Ground2026"}
ALT_USER = {"email": "sdet@example.com", "password": "test1234"}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        return None
    return r.json().get("access_token")


@pytest.fixture(scope="module")
def token():
    tok = _login(**DEFAULT_USER)
    assert tok, "Default user login failed"
    return tok


@pytest.fixture(scope="module")
def alt_token():
    tok = _login(**ALT_USER)
    if not tok:
        # attempt to register alt user
        requests.post(f"{API}/auth/register", json={**ALT_USER, "name": "Alt SDET"})
        tok = _login(**ALT_USER)
    assert tok, "Alt user login failed"
    return tok


def _headers(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


# ---------------- POST /shop/orders shipping method math ----------------


@pytest.mark.parametrize(
    "method,expected_cost,expected_eta",
    [
        ("standard", 0.0, "5-7 business days"),
        ("express", 9.99, "2-3 business days"),
        ("overnight", 24.99, "next business day"),
    ],
)
def test_create_order_shipping_methods(token, method, expected_cost, expected_eta):
    payload = {
        "items": [{"product_id": "p2", "qty": 1}],
        "shipping_name": "TEST_User",
        "shipping_address": "1 Test Rd",
        "shipping_city": "Mumbai",
        "shipping_zip": "400001",
        "shipping_country": "India",
        "shipping_state": "Maharashtra",
        "shipping_method": method,
    }
    r = requests.post(f"{API}/shop/orders", json=payload, headers=_headers(token))
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["subtotal"] == 89.5, f"expected subtotal 89.5, got {data['subtotal']}"
    assert data["shipping_cost"] == expected_cost
    assert data["total"] == round(89.5 + expected_cost, 2)
    ship = data["shipping"]
    assert ship["method"] == method
    assert ship["eta"] == expected_eta
    assert ship["country"] == "India"
    assert ship["state"] == "Maharashtra"
    assert "id" in data


def test_create_order_default_method_is_standard(token):
    payload = {
        "items": [{"product_id": "p2", "qty": 1}],
        "shipping_name": "TEST_Default",
        "shipping_address": "2 Test Rd",
        "shipping_city": "LA",
        "shipping_zip": "90001",
        # no shipping_method -> default
    }
    r = requests.post(f"{API}/shop/orders", json=payload, headers=_headers(token))
    assert r.status_code == 201
    data = r.json()
    assert data["shipping"]["method"] == "standard"
    assert data["shipping_cost"] == 0.0
    assert data["total"] == data["subtotal"]


# ---------------- GET /shop/orders/{id} ----------------


def test_get_order_by_id_returns_full_order(token):
    payload = {
        "items": [{"product_id": "p2", "qty": 1}],
        "shipping_name": "TEST_Get",
        "shipping_address": "3 Test Rd",
        "shipping_city": "Mumbai",
        "shipping_zip": "400001",
        "shipping_country": "India",
        "shipping_state": "Maharashtra",
        "shipping_method": "express",
    }
    c = requests.post(f"{API}/shop/orders", json=payload, headers=_headers(token))
    assert c.status_code == 201
    oid = c.json()["id"]
    g = requests.get(f"{API}/shop/orders/{oid}", headers=_headers(token))
    assert g.status_code == 200
    data = g.json()
    assert data["id"] == oid
    assert data["total"] == 99.49
    assert data["shipping"]["method"] == "express"
    assert data["shipping"]["eta"] == "2-3 business days"
    assert len(data["items"]) == 1
    assert data["items"][0]["product_id"] == "p2"
    # ensure _id/owner not exposed
    assert "_id" not in data
    assert "owner" not in data


def test_get_order_unknown_id_returns_404(token):
    r = requests.get(f"{API}/shop/orders/does-not-exist-xyz", headers=_headers(token))
    assert r.status_code == 404


def test_get_order_without_auth_returns_401(token):
    # create with owner
    payload = {
        "items": [{"product_id": "p2", "qty": 1}],
        "shipping_name": "TEST_NoAuth",
        "shipping_address": "4 Test Rd",
        "shipping_city": "Mumbai",
        "shipping_zip": "400001",
        "shipping_country": "India",
        "shipping_state": "Maharashtra",
        "shipping_method": "standard",
    }
    c = requests.post(f"{API}/shop/orders", json=payload, headers=_headers(token))
    oid = c.json()["id"]
    r = requests.get(f"{API}/shop/orders/{oid}")
    assert r.status_code in (401, 403)


def test_get_other_users_order_returns_404(token, alt_token):
    # order created by default user
    payload = {
        "items": [{"product_id": "p2", "qty": 1}],
        "shipping_name": "TEST_Scope",
        "shipping_address": "5 Test Rd",
        "shipping_city": "Mumbai",
        "shipping_zip": "400001",
        "shipping_country": "India",
        "shipping_state": "Maharashtra",
        "shipping_method": "standard",
    }
    c = requests.post(f"{API}/shop/orders", json=payload, headers=_headers(token))
    oid = c.json()["id"]
    # alt user tries to fetch
    r = requests.get(f"{API}/shop/orders/{oid}", headers=_headers(alt_token))
    assert r.status_code == 404
