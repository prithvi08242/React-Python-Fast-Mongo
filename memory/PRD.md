# PRD — Test Automation & DevOps Practice Ground

## Original Problem Statement
SDET + DevOps engineer wants 3-tier full-stack project(s) with multiple tools/languages to practice automation testing and deployment. Scoped (given the fixed React + FastAPI + MongoDB environment) to ONE comprehensive, deployable practice target.

## Architecture
- Frontend: React (dark IDE theme, Chivo/IBM Plex Sans/JetBrains Mono), react-router, framer-motion.
- Backend: FastAPI + Motor/MongoDB. JWT auth (Bearer header + httpOnly cookie), bcrypt, brute-force lockout, admin seeding, indexes.
- DB: MongoDB (users, todos, login_attempts, password_reset_tokens).
- DevOps: Dockerfile.backend, Dockerfile.frontend (+nginx), docker-compose.yml, .github/workflows/ci.yml.
- Sample tests: pytest API suite (tests/api), Playwright e2e (tests/e2e), Jest unit utils (frontend/src/lib/jsUtils).

## User Personas
- SDET practicing Selenium/Playwright/Cypress UI automation + RestAssured/pytest API testing.
- DevOps engineer practicing containerization + CI/CD against a real app.

## Core Requirements (static)
- 30 UI automation practice sections, each on its own page (`/practice/<slug>`), stable data-testids.
- Documented, testable REST API (`/api/playground/*`) with pagination, status echo, delay, flaky, echo.
- JWT auth flow: register, login, me, logout, refresh.
- DevOps artifacts + sample test suites + README.

## Implemented (2026-07-01)
- Full auth (register/login/me/logout/refresh, admin seeded admin@example.com/admin123). Backend pytest 13/13 green.
- All 30 practice sections rendering; representative subset verified via testing agent (basic-form, table, modal, tabs, slider, date, dynamic-list, shadow-dom, network-delay, flaky, etc.).
- API Playground UI at `/rest-playground` (renamed from `/api-playground` to avoid `/api/*` ingress collision — CRITICAL fix).
- Docker, docker-compose, GitHub Actions CI, README, pytest + Playwright + Jest samples.
- **E-commerce module "Gadget Store" (2026-07-01):** 6 seeded products (AI-generated dark product images), category + search filters, product detail, localStorage cart with header badge, auth-gated checkout (server-side total computation), order history scoped per user. Backend 13/13 + frontend 11/11 flows green. Routes: `/shop`, `/shop/product/:id`, `/shop/cart`, `/shop/checkout` (protected), `/shop/orders` (protected). API: `/api/shop/products`, `/api/shop/products/{id}`, `POST/GET /api/shop/orders`.

## Known Minor Items (deferred, low impact)
- `/auth/refresh` only rotates access cookie; frontend uses localStorage token as source of truth.
- seed_admin does not clear admin login_attempts lockout on password change.
- Dual token mechanism (localStorage + cookie) — works but could be unified.
- Production hardening: cookies secure=True over HTTPS, rotate JWT_SECRET, don't commit secrets.

## Backlog / Next Tasks
- P1: Per-user todo dashboard page in the UI (list/create/complete) to complement API Playground.
- P1: Split server.py into routers (auth, playground) as it grows.
- P2: Add Cypress sample spec + more Playwright coverage across all 30 sections.
- P2: Selenium (Java/Python) starter Page Object examples in /tests.
- P2: forgot/reset password UI.
