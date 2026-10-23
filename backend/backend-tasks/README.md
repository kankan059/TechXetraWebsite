# TechXetra Backend — Node.js + Express + PostgreSQL Migration Task Pack

This task pack provides a complete, step-by-step implementation guide for an AI agent or engineer to migrate the TechXetra backend from **Hono + Cloudflare Workers + D1 (SQLite)** to **Node.js + Express + PostgreSQL (using Drizzle ORM)**.

---

## 🧭 Navigation & Task Index

| Task File | Scope & Focus | Key Deliverables |
|---|---|---|
| **[`TASK-01-PROJECT-SETUP-AND-ENV.md`](./TASK-01-PROJECT-SETUP-AND-ENV.md)** | Foundation & Infrastructure | Node.js, Express, TypeScript, Docker Compose (Postgres 16), connection pooling, `.env` schema validation. |
| **[`TASK-02-POSTGRES-SCHEMA-AND-MIGRATIONS.md`](./TASK-02-POSTGRES-SCHEMA-AND-MIGRATIONS.md)** | Database Schema (Drizzle ORM) | 14 tables, PostgreSQL enums, foreign keys, partial unique indexes, check constraints, initial seed data. |
| **[`TASK-03-MIDDLEWARE-AND-FOUNDATION.md`](./TASK-03-MIDDLEWARE-AND-FOUNDATION.md)** | Core Middleware & Response Layer | Request ID tracing, structured logger, standard JSON envelopes, centralized error mapping, CORS, Helmet, CSRF, health routes. |
| **[`TASK-04-AUTH-SESSIONS-AND-PROFILE.md`](./TASK-04-AUTH-SESSIONS-AND-PROFILE.md)** | Identity, Auth & User Profile | Sequential `TX26XXXX` User ID, PBKDF2 email/password auth, Google OAuth (JWKS), sliding sessions, profile completeness, student lock. |
| **[`TASK-05-CATALOG-EVENTS-AND-LEADERBOARDS.md`](./TASK-05-CATALOG-EVENTS-AND-LEADERBOARDS.md)** | Public Events & Tournaments | Festival pass pricing, public event browsing with search/filters/pagination, seat calculation, public tournament leaderboards. |
| **[`TASK-06-TEAMS-AND-INVITATIONS.md`](./TASK-06-TEAMS-AND-INVITATIONS.md)** | Teams & In-App Invitations | Team state machine (DRAFT -> LOCKED -> CONFIRMED), in-app invites on website dashboard, accept/decline, roster rules. |
| **[`TASK-07-PURCHASES-AND-INVENTORY-RESERVATION.md`](./TASK-07-PURCHASES-AND-INVENTORY-RESERVATION.md)** | Checkout & 15-Minute Seat Hold | Native Postgres transactions with row-level locking (`FOR UPDATE`), 15-minute countdown, pricing matrix, dynamic form validation, free passes. |
| **[`TASK-08-PAYMENTS-AND-UPI-VERIFICATION.md`](./TASK-08-PAYMENTS-AND-UPI-VERIFICATION.md)** | Manual UPI Payments & Review | UPI intent links, UTR submission with deduplication, timer pause, payment review desk, anti-self-dealing, durable payment truth. |
| **[`TASK-09-DIGITAL-TICKETS-AND-QR-SCANNING.md`](./TASK-09-DIGITAL-TICKETS-AND-QR-SCANNING.md)** | Tickets, HMAC QR Codes & Check-In | Signed QR tokens (`tx1.<id>.<ver>.<hmac>`), participant ticket view, volunteer pre-scan lookup, single-use event check-in, pass-back warning. |
| **[`TASK-10-ESPORTS-TOURNAMENT-SCORING.md`](./TASK-10-ESPORTS-TOURNAMENT-SCORING.md)** | E-Sports Scoring Engine | Round score management, optimistic concurrency versioning (`expected_version`), finalize/reopen scoring, immutable score history. |
| **[`TASK-11-STAFF-AND-COMMITTEE-PORTAL.md`](./TASK-11-STAFF-AND-COMMITTEE-PORTAL.md)** | Event Committee Hub | Staff dashboard with live metrics, attendee rosters with custom question answers, event-scoped payment review, operational event edits. |
| **[`TASK-12-ADMIN-MANAGEMENT-REPORTS-AND-AUDIT.md`](./TASK-12-ADMIN-MANAGEMENT-REPORTS-AND-AUDIT.md)** | Super Admin Control Suite | User directory & role promotion, safe event deletion, staff assignment, ticket lifecycle overrides, settings, financial/attendance reports, audit logs. |
| **[`TASK-13-TESTING-DOCKER-AND-DEPLOYMENT.md`](./TASK-13-TESTING-DOCKER-AND-DEPLOYMENT.md)** | Verification & Production Setup | End-to-end integration test suite, multi-stage `Dockerfile`, PM2 cluster configuration for multi-core performance. |

---

## ⚡ Instructions for the AI Coding Agent

1. **Reference Authoritative Docs:** Always consult `backend/structure/` for the complete API contracts, field names, and business rules.
2. **Execute In Numeric Order:** Execute Task 01 through Task 13 sequentially. Do not skip tasks.
3. **Preserve All Non-Negotiable Invariants:**
   * **Monetary Precision:** All money stored and computed in integer **paise** (`₹100` = `10000`). Never use floating-point numbers.
   * **Time Safety:** All timestamps are 64-bit Unix epoch milliseconds (`Date.now()`).
   * **Native Transactions:** Use PostgreSQL interactive transactions (`db.transaction(async (tx) => ...)`) with row-level locks (`SELECT ... FOR UPDATE`) to prevent overselling. Do not re-create the D1 `_guard` table.
   * **Sequential User IDs:** All users must be assigned IDs formatted as `TX26XXXX` (e.g., `TX260001`).
   * **Durable Payment Truth:** Once a payment is approved, the purchase is permanently `PAID`. If ticket generation fails, leave it `PAID` with `fulfillment_status = 'FAILED'` so it can be retried without double charging.
   * **Anti-Self-Dealing:** Organizers and reviewers can never review or approve their own payment submissions.
   * **In-App Team Invitations:** Team invitations must be in-app records visible on the user's dashboard (not external emails).
   * **Append-Only Auditing:** Maintain immutable audit logs for all administrative actions, payment transitions, and score modifications.
   * **Strict Validation:** Use Zod schemas with `.strict()` on all request bodies, query parameters, and URL route parameters.
   * **Data Redaction:** Never log passwords, tokens, bank UTRs, or phone numbers.
