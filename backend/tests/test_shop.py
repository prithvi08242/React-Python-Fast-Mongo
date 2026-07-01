"""Backend API tests for Shop feature (products, orders).
Covers: product listing, filters, product detail, order creation (auth required),
order listing by user, isolation between users.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().strip('"')
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def user_token():
    """Fresh user for isolation tests."""
    email = f"shopuser+{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "test1234", "name": "Shop User"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# --- Products ---
def test_list_products_seeded():
    r = requests.get(f"{API}/shop/products")
    assert r.status_code == 200
    body = r.json()
    assert "data" in body and "total" in body and "categories" in body
    assert body["total"] == 6, f"Expected 6 seeded products, got {body['total']}"
    ids = {p["id"] for p in body["data"]}
    assert ids == {"p1", "p2", "p3", "p4", "p5", "p6"}
    # Sorted by price ascending
    prices = [p["price"] for p in body["data"]]
    assert prices == sorted(prices)
    # Categories present
    assert set(["audio", "peripherals", "video", "office"]).issubset(set(body["categories"]))


def test_filter_by_category_office():
    r = requests.get(f"{API}/shop/products", params={"category": "office"})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    for p in body["data"]:
        assert p["category"] == "office"


def test_filter_by_search_mug():
    r = requests.get(f"{API}/shop/products", params={"search": "mug"})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert any("Mug" in p["name"] or "mug" in p["name"].lower() for p in body["data"])


def test_filter_category_all_returns_all():
    r = requests.get(f"{API}/shop/products", params={"category": "all"})
    assert r.status_code == 200
    assert r.json()["total"] == 6


def test_get_product_p1():
    r = requests.get(f"{API}/shop/products/p1")
    assert r.status_code == 200
    p = r.json()
    assert p["id"] == "p1"
    assert p["name"] == "Aero Wireless Headphones"
    assert p["price"] == 129.99
    assert p["stock"] == 25
    assert "_id" not in p


def test_get_product_not_found():
    r = requests.get(f"{API}/shop/products/nope")
    assert r.status_code == 404


# --- Orders ---
def test_create_order_requires_auth():
    r = requests.post(
        f"{API}/shop/orders",
        json={
            "items": [{"product_id": "p1", "qty": 1}],
            "shipping_name": "N",
            "shipping_address": "A",
            "shipping_city": "C",
            "shipping_zip": "1",
        },
    )
    assert r.status_code == 401


def test_get_orders_requires_auth():
    r = requests.get(f"{API}/shop/orders")
    assert r.status_code == 401


def test_create_order_computes_total_server_side(admin_token):
    # p3 price 49.00, qty 2 => 98.00; p6 price 14.99, qty 1 => 14.99; total 112.99
    payload = {
        "items": [
            {"product_id": "p3", "qty": 2},
            {"product_id": "p6", "qty": 1},
        ],
        "shipping_name": "Admin",
        "shipping_address": "1 Test St",
        "shipping_city": "Testville",
        "shipping_zip": "12345",
    }
    r = requests.post(
        f"{API}/shop/orders",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 201, r.text
    order = r.json()
    assert order["status"] == "confirmed"
    assert order["total"] == 112.99
    assert order["item_count"] == 3
    assert len(order["items"]) == 2
    assert "_id" not in order
    assert "owner" not in order
    assert order["shipping"]["city"] == "Testville"
    # Verify GET orders returns it
    r2 = requests.get(f"{API}/shop/orders", headers={"Authorization": f"Bearer {admin_token}"})
    assert r2.status_code == 200
    body = r2.json()
    ids = [o["id"] for o in body["data"]]
    assert order["id"] in ids


def test_create_order_ignores_client_total(admin_token):
    """Even if client sends malicious price, server computes from DB."""
    payload = {
        "items": [{"product_id": "p6", "qty": 1, "price": 0.01}],  # extra field ignored by pydantic
        "shipping_name": "A", "shipping_address": "B", "shipping_city": "C", "shipping_zip": "1",
    }
    r = requests.post(f"{API}/shop/orders", json=payload,
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 201
    assert r.json()["total"] == 14.99


def test_create_order_invalid_product(admin_token):
    r = requests.post(
        f"{API}/shop/orders",
        json={
            "items": [{"product_id": "bogus", "qty": 1}],
            "shipping_name": "A", "shipping_address": "B", "shipping_city": "C", "shipping_zip": "1",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 400


def test_create_order_empty_items(admin_token):
    r = requests.post(
        f"{API}/shop/orders",
        json={"items": [], "shipping_name": "A", "shipping_address": "B", "shipping_city": "C", "shipping_zip": "1"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 400


def test_orders_are_user_scoped(user_token, admin_token):
    # Create an order as fresh user
    r = requests.post(
        f"{API}/shop/orders",
        json={
            "items": [{"product_id": "p1", "qty": 1}],
            "shipping_name": "U", "shipping_address": "X", "shipping_city": "Y", "shipping_zip": "0",
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 201
    user_order_id = r.json()["id"]

    # user sees own order
    r = requests.get(f"{API}/shop/orders", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200
    assert any(o["id"] == user_order_id for o in r.json()["data"])

    # admin should NOT see the user's order
    r = requests.get(f"{API}/shop/orders", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert not any(o["id"] == user_order_id for o in r.json()["data"])
