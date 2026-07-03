import os
import jwt
import bcrypt
import uuid
import asyncio
import secrets
import logging

from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Config / DB
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("practice-ground")

app = FastAPI(title="Test Automation & DevOps Practice Ground API")
api_router = APIRouter(prefix="/api")


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


# ---------------------------------------------------------------------------
# Password + JWT helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie(
        "access_token",
        access,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600,
        path="/",
    )
    response.set_cookie(
        "refresh_token",
        refresh,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/",
    )


def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "user"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Auth models
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api_router.post("/auth/register")
async def register(body: RegisterInput, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    access = create_access_token(str(res.inserted_id), email)
    refresh = create_refresh_token(str(res.inserted_id))
    set_auth_cookies(response, access, refresh)
    return {"user": public_user(doc), "access_token": access, "token_type": "bearer"}


@api_router.post("/auth/login")
async def login(body: LoginInput, request: Request, response: Response):
    email = body.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= MAX_FAILED_ATTEMPTS:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > datetime.now(
            timezone.utc
        ):
            raise HTTPException(
                status_code=429, detail="Too many failed attempts. Try again later."
            )

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        new_count = (attempt.get("count", 0) if attempt else 0) + 1
        update = {"count": new_count}
        if new_count >= MAX_FAILED_ATTEMPTS:
            update["locked_until"] = (
                datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
            ).isoformat()
        await db.login_attempts.update_one(
            {"identifier": identifier}, {"$set": update}, upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    access = create_access_token(str(user["_id"]), email)
    refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, refresh)
    return {"user": public_user(user), "access_token": access, "token_type": "bearer"}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(
            "access_token",
            access,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=3600,
            path="/",
        )
        return {"access_token": access, "token_type": "bearer"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ---------------------------------------------------------------------------
# API Playground (for API testing practice: RestAssured / pytest / Postman)
# ---------------------------------------------------------------------------
class TodoInput(BaseModel):
    title: str = Field(min_length=1)
    completed: bool = False
    priority: str = "medium"


def todo_public(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "title": doc["title"],
        "completed": doc["completed"],
        "priority": doc["priority"],
        "created_at": doc["created_at"],
    }


@api_router.get("/")
async def root():
    return {"message": "Practice Ground API is running", "docs": "/docs"}


@api_router.get("/playground/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@api_router.get("/playground/todos")
async def list_todos(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    completed: Optional[bool] = None,
    search: Optional[str] = None,
):
    query: dict = {}
    if completed is not None:
        query["completed"] = completed
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    total = await db.todos.count_documents(query)
    skip = (page - 1) * limit
    docs = (
        await db.todos.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return {
        "data": [todo_public(d) for d in docs],
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit if total else 0,
    }


@api_router.post("/playground/todos", status_code=201)
async def create_todo(body: TodoInput, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "title": body.title,
        "completed": body.completed,
        "priority": body.priority,
        "owner": str(user["_id"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.todos.insert_one(doc)
    return todo_public(doc)


@api_router.get("/playground/todos/{todo_id}")
async def get_todo(todo_id: str):
    doc = await db.todos.find_one({"id": todo_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo_public(doc)


@api_router.put("/playground/todos/{todo_id}")
async def update_todo(
    todo_id: str, body: TodoInput, user: dict = Depends(get_current_user)
):
    doc = await db.todos.find_one({"id": todo_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Todo not found")
    update = {
        "title": body.title,
        "completed": body.completed,
        "priority": body.priority,
    }
    await db.todos.update_one({"id": todo_id}, {"$set": update})
    doc.update(update)
    return todo_public(doc)


@api_router.delete("/playground/todos/{todo_id}")
async def delete_todo(todo_id: str, user: dict = Depends(get_current_user)):
    res = await db.todos.delete_one({"id": todo_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Todo not found")
    return {"message": "Deleted", "id": todo_id}


@api_router.get("/playground/status/{code}")
async def echo_status(code: int):
    if code < 100 or code > 599:
        raise HTTPException(status_code=400, detail="Invalid status code")
    return JSONResponse(
        status_code=code,
        content={"status_code": code, "message": f"Returned status {code}"},
    )


@api_router.get("/playground/delay/{seconds}")
async def delayed(seconds: float):
    seconds = min(seconds, 10)
    await asyncio.sleep(seconds)
    return {"delayed": seconds, "message": f"Responded after {seconds}s"}


@api_router.get("/playground/flaky")
async def flaky():
    if secrets.randbelow(2) == 0:
        raise HTTPException(status_code=500, detail="Flaky server error, retry")
    return {"message": "Success on this attempt", "lucky": True}


@api_router.post("/playground/echo")
async def echo(request: Request):
    body = await request.json()
    return {"you_sent": body, "received_at": datetime.now(timezone.utc).isoformat()}


@api_router.get("/playground/users")
async def sample_users():
    return {
        "users": [
            {"id": 1, "name": "Ada Lovelace", "role": "admin", "active": True},
            {"id": 2, "name": "Alan Turing", "role": "user", "active": True},
            {"id": 3, "name": "Grace Hopper", "role": "user", "active": False},
            {"id": 4, "name": "Linus Torvalds", "role": "maintainer", "active": True},
        ]
    }


# ---------------------------------------------------------------------------
# Shop (small e-commerce for browse -> cart -> checkout -> orders practice)
# ---------------------------------------------------------------------------
IMG = "https://static.prod-images.emergentagent.com/jobs/bd9da897-6a8d-4867-b609-1dbb1bd3815d/images/"
SEED_PRODUCTS = [
    {
        "id": "p1",
        "name": "Aero Wireless Headphones",
        "price": 129.99,
        "category": "audio",
        "stock": 25,
        "image": IMG
        + "63c41db534c895c6b2c8652a351325dd707240d34605b098d53843dc4ee02e57.png",
        "description": "Over-ear wireless headphones with active noise cancellation and 30h battery.",
    },
    {
        "id": "p2",
        "name": "Compact Mechanical Keyboard",
        "price": 89.50,
        "category": "peripherals",
        "stock": 40,
        "image": IMG
        + "ce192cbe9c4470bab43d32e4a1c0ff5d79aa3273b19ec836673fa07dd3e418cc.png",
        "description": "65% hot-swappable mechanical keyboard with per-key RGB backlight.",
    },
    {
        "id": "p3",
        "name": "Ergo Wireless Mouse",
        "price": 49.00,
        "category": "peripherals",
        "stock": 60,
        "image": IMG
        + "371abcc92026200a4a95fb0f4a806bddb4b566cd78317f3e66fe298984cdcc67.png",
        "description": "Ergonomic wireless mouse with silent clicks and 4000 DPI sensor.",
    },
    {
        "id": "p4",
        "name": "Studio 4K Webcam",
        "price": 99.99,
        "category": "video",
        "stock": 18,
        "image": IMG
        + "74867aba4e91dac7fedff58fcc943924f27b66bace634b293be2b61f805c0cfa.png",
        "description": "4K UHD webcam with autofocus and dual noise-cancelling mics.",
    },
    {
        "id": "p5",
        "name": "Minimalist LED Desk Lamp",
        "price": 39.99,
        "category": "office",
        "stock": 35,
        "image": IMG
        + "2d8532c3b4dfe3de2fd7ff20b64300f15a170855943557b25c7739798c1c88e2.png",
        "description": "Dimmable LED desk lamp with adjustable arm and warm/cool modes.",
    },
    {
        "id": "p6",
        "name": "Matte Ceramic Coffee Mug",
        "price": 14.99,
        "category": "office",
        "stock": 100,
        "image": IMG
        + "1b305f7fa2ba4cec3b0bce3576569701c0974fd350a4ebca6161774f5a47fbde.png",
        "description": "350ml matte-black ceramic mug, dishwasher and microwave safe.",
    },
]


class OrderItemInput(BaseModel):
    product_id: str
    qty: int = Field(ge=1)


class OrderInput(BaseModel):
    items: List[OrderItemInput]
    shipping_name: str = Field(min_length=1)
    shipping_address: str = Field(min_length=1)
    shipping_city: str = Field(min_length=1)
    shipping_zip: str = Field(min_length=1)
    shipping_country: str = Field(default="")
    shipping_state: str = Field(default="")
    shipping_method: str = Field(default="standard")


SHIPPING_COSTS = {"standard": 0.0, "express": 9.99, "overnight": 24.99}
SHIPPING_ETA = {
    "standard": "5-7 business days",
    "express": "2-3 business days",
    "overnight": "next business day",
}


@api_router.get("/shop/products")
async def list_products(category: Optional[str] = None, search: Optional[str] = None):
    query: dict = {}
    if category and category != "all":
        query["category"] = category
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    docs = await db.products.find(query, {"_id": 0}).sort("price", 1).to_list(100)
    cats = await db.products.distinct("category")
    return {"data": docs, "total": len(docs), "categories": sorted(cats)}


@api_router.get("/shop/products/{product_id}")
async def get_product(product_id: str):
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return doc


@api_router.post("/shop/orders", status_code=201)
async def create_order(body: OrderInput, user: dict = Depends(get_current_user)):
    if not body.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    line_items = []
    total = 0.0
    for item in body.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(
                status_code=400, detail=f"Product {item.product_id} not found"
            )
        subtotal = round(product["price"] * item.qty, 2)
        total += subtotal
        line_items.append(
            {
                "product_id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "qty": item.qty,
                "subtotal": subtotal,
            }
        )
    total = round(total, 2)
    shipping_cost = SHIPPING_COSTS.get(body.shipping_method, 0.0)
    grand_total = round(total + shipping_cost, 2)
    order = {
        "id": str(uuid.uuid4()),
        "owner": str(user["_id"]),
        "items": line_items,
        "subtotal": total,
        "shipping_cost": shipping_cost,
        "total": grand_total,
        "item_count": sum(i.qty for i in body.items),
        "status": "confirmed",
        "shipping": {
            "name": body.shipping_name,
            "address": body.shipping_address,
            "city": body.shipping_city,
            "zip": body.shipping_zip,
            "country": body.shipping_country,
            "state": body.shipping_state,
            "method": body.shipping_method,
            "eta": SHIPPING_ETA.get(body.shipping_method, ""),
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order)
    order.pop("owner", None)
    order.pop("_id", None)
    return order


@api_router.get("/shop/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    docs = (
        await db.orders.find({"owner": str(user["_id"])}, {"_id": 0, "owner": 0})
        .sort("created_at", -1)
        .to_list(100)
    )
    return {"data": docs, "total": len(docs)}


@api_router.get("/shop/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    doc = await db.orders.find_one(
        {"id": order_id, "owner": str(user["_id"])}, {"_id": 0, "owner": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return doc


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
async def seed_products():
    for p in SEED_PRODUCTS:
        await db.products.update_one({"id": p["id"]}, {"$set": p}, upsert=True)


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one(
            {
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "name": "Admin",
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        logger.info("Seeded admin user %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )


async def seed_default_user():
    email = os.environ.get("DEFAULT_USER_EMAIL", "tester@practiceground.dev").lower()
    password = os.environ.get("DEFAULT_USER_PASSWORD", "Test@Ground2026")
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one(
            {
                "email": email,
                "password_hash": hash_password(password),
                "name": "Default Tester",
                "role": "user",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        logger.info("Seeded default user %s", email)
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one(
            {"email": email}, {"$set": {"password_hash": hash_password(password)}}
        )


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await seed_admin()
    await seed_default_user()
    await seed_products()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api_router)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
