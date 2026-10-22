# TechXetra Backend — Complete Codebase Index & Architectural Structure

> **Purpose for AI Agents & Developers**: 
> This `structure/` directory is the single source of truth for the entire `techxetra-backend` codebase. When starting any new session, an AI agent or engineer can read this folder to immediately understand the repository layout, layer responsibilities, database schema, and every API route and its underlying business logic without needing to re-read and parse dozens of source code files.

---

## 🧭 Navigation & Document Index

| Document | Description | Key Contents |
|---|---|---|
| **[`00-OVERVIEW-AND-ARCHITECTURE.md`](./00-OVERVIEW-AND-ARCHITECTURE.md)** | System overview & non-negotiable invariants | Cloudflare Workers edge runtime, Hono v4, D1 SQLite batch mechanics, `_guard` verify-after-write pattern, monetary safety, session lifetimes |
| **[`01-DIRECTORY-AND-FILE-INDEX.md`](./01-DIRECTORY-AND-FILE-INDEX.md)** | Exhaustive file-by-file map | Every single file in `src/`, `migrations/`, `scripts/`, `tests/`, its layer, exports, dependencies, and DB tables accessed |
| **[`02-ROUTES-AND-ENDPOINTS-REGISTRY.md`](./02-ROUTES-AND-ENDPOINTS-REGISTRY.md)** | Complete route catalogue (All 24 route modules) | Method, path, auth/role guards, Zod validation schemas, step-by-step logic execution, service calls, error codes, response shapes |
| **[`03-SERVICES-AND-BUSINESS-LOGIC.md`](./03-SERVICES-AND-BUSINESS-LOGIC.md)** | Core domain services (All 21 services) | Business workflows: Checkout & reservation holds, manual UPI verification, HMAC QR tokens, check-in rules, e-sports scoring & concurrency |
| **[`04-DATABASE-SCHEMA-AND-CONSTRAINTS.md`](./04-DATABASE-SCHEMA-AND-CONSTRAINTS.md)** | Database models & SQL triggers | Table schemas, foreign keys, CHECK constraints, partial unique indexes, append-only SQLite triggers, D1 batch guard mechanics |

---

## ⚡ 60-Second Mental Model

```
                    Incoming HTTP Request
                              │
               ┌──────────────▼──────────────┐
               │    Global Middleware Chain  │
               │  - X-Request-Id & Timestamp │
               │  - CORS (Credentials & Org) │
               │  - Security Headers (HSTS)  │
               │  - CSRF Mutation Protection │
               └──────────────┬──────────────┘
                              │
               ┌──────────────▼──────────────┐
               │   Route Controllers Layer   │
               │  `src/routes/*.ts`          │
               │  - Zod .strict() validation │
               │  - Auth & Role Guards       │
               └──────────────┬──────────────┘
                              │
               ┌──────────────▼──────────────┐
               │     Domain Services Layer   │
               │  `src/services/*.ts`        │
               │  - Pure business logic      │
               │  - Prepares SQL batches     │
               │  - Appends `_guard` checks  │
               └──────────────┬──────────────┘
                              │
               ┌──────────────▼──────────────┐
               │   Database Batch Execution  │
               │  `src/db/batch.ts`          │
               │  - Cloudflare D1 (SQLite)   │
               │  - Single atomic db.batch() │
               │  - Maps SQLite errors       │
               └─────────────────────────────┘
```

---

## 📋 Standard API Response Envelope

All API endpoints return JSON conforming to the standard envelope:

### Success (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "data": { ... },
  "request_id": "c1f7b8c2-3e4a-4b9d-8c1e-9f0a1b2c3d4e"
}
```

### Error (`4xx`, `5xx`):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error description",
    "details": [ ... ]
  },
  "request_id": "c1f7b8c2-3e4a-4b9d-8c1e-9f0a1b2c3d4e"
}
```
