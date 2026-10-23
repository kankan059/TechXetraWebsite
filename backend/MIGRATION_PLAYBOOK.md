# TechXetra Backend Migration Playbook — Complete Agent Execution Guide

> **Purpose:** This document is your complete, step-by-step manual for migrating the TechXetra backend from **Hono + Cloudflare Workers + D1 (SQLite)** to **Node.js + Express + PostgreSQL (Drizzle ORM)** using an AI coding agent.
> 
> Follow this guide exactly to guarantee **100% feature parity**, zero missing edge cases, and a clean, future-proof codebase.

---

## 🛑 The Golden Rule of AI Coding Agents

> **DO NOT ask the agent to write the whole backend in one single prompt.**
> 
> If you say *"Here are the tasks, write the backend"*, any AI agent will hit context/token limits, skip edge cases, and leave `// TODO` placeholders.
> 
> **The Secret to 100% Success:** Feed the agent **ONE task at a time** in numeric order. Make it complete the task's verification checklist before moving to the next one.

---

## 📁 1. What Folders to Copy to Your New Directory

When you create your new backend folder (e.g. `techxetra-express-backend/`), copy these **3 folders** and files from this repo:

1. **`structure/`** $\rightarrow$ The single source of truth for the entire API architecture, endpoints, and business rules.
2. **`backend-tasks/`** $\rightarrow$ The 13 detailed step-by-step migration blueprints.
3. **`src/`** (from current backend) $\rightarrow$ **Keep this as a read-only reference folder!** It contains the exact Zod schemas, regex formulas (phone number formatting, UTR sanitization), and logic formulas so the agent doesn't have to reinvent them.
4. **`techxetra_2026_events.json`** $\rightarrow$ The real festival event catalog for database seeding.

---

## 🗄️ 2. Database Options for Development

Before starting, you need a running PostgreSQL instance for the agent to run migrations and tests against:

### Option A: Local Docker (Recommended — Fastest & Free)
If you have Docker Desktop or Docker engine installed:
```bash
docker run --name techxetra-pg -e POSTGRES_USER=techxetra -e POSTGRES_PASSWORD=techxetra_password -e POSTGRES_DB=techxetra_db -p 5432:5432 -d postgres:16-alpine
```
Your `DATABASE_URL` will be:
`postgresql://techxetra:techxetra_password@localhost:5432/techxetra_db`

### Option B: Free Cloud Database (Neon / Supabase)
If you don't want to run Docker locally:
1. Go to [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com) and create a free project.
2. Copy the PostgreSQL connection string (`DATABASE_URL`).

---

## 🤖 3. Step-by-Step AI Prompting Instructions

Open your coding agent in the new project directory. Follow these exact prompts one by one:

---

### Step 1: Foundation & Project Setup
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-01-PROJECT-SETUP-AND-ENV.md` and `structure/00-OVERVIEW-AND-ARCHITECTURE.md`. Initialize the Node.js TypeScript project, install Express, Drizzle ORM, `pg`, Zod, and set up the strict environment variable validation and Docker Compose. Verify that `npm run dev` boots without errors."*

* **Check before proceeding:** The server starts up and prints that it is listening on port 4000.

---

### Step 2: PostgreSQL Schema & Database Migrations
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-02-POSTGRES-SCHEMA-AND-MIGRATIONS.md` and `structure/04-DATABASE-SCHEMA-AND-CONSTRAINTS.md`. Write the complete Drizzle ORM schema for all 14 tables in `src/db/schema.ts`, including all enums, foreign keys, and partial unique indexes. Generate the migration files and run `npm run db:migrate` and `npm run db:seed` against our PostgreSQL database."*

* **Check before proceeding:** `drizzle-kit generate` and `drizzle-kit migrate` succeed with no errors. Inspect your database to confirm all 14 tables exist.

---

### Step 3: Core Middlewares, Error Handlers & Health Checks
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-03-MIDDLEWARE-AND-FOUNDATION.md`. Implement the request ID tracker, redacted structured logger, standard `{ success, data, request_id }` response envelopes, centralized AppError / Postgres error mapper, Helmet, CORS, and CSRF mutation origin checks. Mount the `/health` and `/ready` routes. Verify that both routes return 200 OK."*

* **Check before proceeding:** `curl http://localhost:4000/ready` returns `{ "status": "ready", "database": "connected" }`.

---

### Step 4: Authentication, Sliding Sessions & Profiles
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-04-AUTH-SESSIONS-AND-PROFILE.md` and `structure/03-SERVICES-AND-BUSINESS-LOGIC.md` (§1). Reference the existing PBKDF2 hashing and Google token verification from the reference `src/` folder. Implement sequential `TX26XXXX` ID generation, email/password registration, Google OAuth sign-in, sliding session cookies, profile completeness checking, and the student discount field lock. Verify with tests."*

* **Check before proceeding:** Register a new user and confirm their ID is formatted as `TX260001`.

---

### Step 5: Public Catalog, Events & Leaderboards
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-05-CATALOG-EVENTS-AND-LEADERBOARDS.md` and `structure/02-ROUTES-AND-ENDPOINTS-REGISTRY.md` (§4). Implement the pass catalog endpoint, public event search/filtering/pagination with real-time seat calculation, single event retrieval, and public e-sports leaderboards with automated round tie-breaking."*

* **Check before proceeding:** `GET /api/events` correctly returns published events and calculates `seats_remaining`.

---

### Step 6: Teams & In-App Member Invitations
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-06-TEAMS-AND-INVITATIONS.md`. Implement team creation, team rosters, and in-app dashboard invitations (note: invitations are on the website dashboard, not external emails). Implement invite accept/decline, member removal, and the pre-checkout validation service (`validateTeamForPurchase`)."*

* **Check before proceeding:** Create a team, invite a member, and verify the invite shows up in `GET /api/team-invites/mine` for the invitee.

---

### Step 7: Purchases, Checkout & 15-Minute Seat Reservation
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-07-PURCHASES-AND-INVENTORY-RESERVATION.md`. Implement the checkout reservation system using native PostgreSQL interactive transactions with row-level locking (`SELECT ... FOR UPDATE` on events). Implement the 15-minute expiry timer, General vs Student pricing, the All-Student rule for teams, dynamic custom question form validation, and instant fulfillment for ₹0 free passes."*

* **Check before proceeding:** Start a purchase reservation and verify that the 15-minute countdown starts and event seats are temporarily locked.

---

### Step 8: Manual UPI Payments & Review Desk
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-08-PAYMENTS-AND-UPI-VERIFICATION.md`. Implement UPI deep-link intent generation, 12-digit UTR submission with duplicate prevention, payment withdrawal, the reviewer verification workflow, anti-self-dealing protection, and the Durable Payment Truth invariant (purchases remain PAID if ticket issuance glitches). Implement the retry-fulfillment endpoint."*

* **Check before proceeding:** Submit a UTR number; confirm the 15-minute timer pauses; verify reviewers cannot approve their own payments.

---

### Step 9: Digital Tickets, HMAC QR Codes & Scanner Check-In
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-09-DIGITAL-TICKETS-AND-QR-SCANNING.md`. Implement HMAC-SHA256 tamper-proof QR code generation (`tx1.<id>.<ver>.<hmac>`), participant ticket listing, volunteer pre-scan inspection (`/lookup`), pass-back alerts within 15 minutes, physical student ID verification confirmation, and single-use event check-in (`/admit`)."*

* **Check before proceeding:** Verify that scanning an event ticket a second time fails with `409 ALREADY_CHECKED_IN`.

---

### Step 10: E-Sports Tournament Scoring Engine
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-10-ESPORTS-TOURNAMENT-SCORING.md`. Implement round score recording with optimistic concurrency versioning (`expected_version` check), score finalization, reopening, and the append-only `esports_score_history` table."*

* **Check before proceeding:** Submit a score with an outdated version number and confirm it rejects with `409 SCORE_VERSION_CONFLICT`.

---

### Step 11: Staff & Event Committee Portal
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-11-STAFF-AND-COMMITTEE-PORTAL.md`. Implement the staff event hub (`/mine`), live metrics dashboard, attendee roster with parsed custom form answers, event-scoped payment review, and operational event configuration editing (protecting ticket fees and capacity from lead edits)."*

* **Check before proceeding:** Confirm an Event Lead can see their assigned event's attendee roster and submitted custom question answers.

---

### Step 12: Super Admin Operations, Reports & Audit Trails
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-12-ADMIN-MANAGEMENT-REPORTS-AND-AUDIT.md`. Implement user role management (blocking self-demotion), safe event deletion (soft-cancel if attendees exist), staff assignments, ticket lifecycle overrides (revoke, reissue, rotate QR version, undo check-in), settings sync, financial & turnstile attendance reports, and audit logs."*

* **Check before proceeding:** Confirm that rotating a ticket's QR version increments the version and invalidates old QR codes.

---

### Step 13: Full Automated Test Suite & Production Setup
> **Prompt for Agent:**
> *"Read `backend-tasks/TASK-13-TESTING-DOCKER-AND-DEPLOYMENT.md`. Implement the complete Vitest/Supertest integration test suite covering all domains, edge cases, and concurrency checks (especially 10 simultaneous checkouts on the last remaining seat). Create the production multi-stage Dockerfile, PM2 cluster configuration (`ecosystem.config.cjs`), and production Docker Compose with Caddy for free automated HTTPS."*

* **Check before proceeding:** Run `npm run test`. **Every single test must pass 100% green.**

---

## 🚢 4. Deployment Instructions (For the Fest)

When you are ready to deploy:

1. **Rent a VPS:** A standard 2 vCPU / 4GB RAM server from DigitalOcean (Bangalore datacenter) or AWS EC2 (Mumbai `t4g.small`) costs around **₹1,000 for the entire month**.
2. **Point Your Domain:** Point `api.techxetra.in` (A Record) to your server's IP address.
3. **Start the Stack:**
   ```bash
   # On your server
   git clone <your-repo>
   cd <your-repo>
   cp .env.example .env   # Fill in your production secrets
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. **Done:** Caddy will automatically provision a free Let's Encrypt SSL certificate (`https://api.techxetra.in`), and your Express + PostgreSQL backend will be live, fast, and multi-core optimized!

---

## 🔮 5. Why Future Changes Will Be Super Easy

* **Want to add Razorpay / Cashfree next year?**
  Just add a `src/services/razorpay.service.ts` file and call the existing ticket fulfillment function on webhook success.
* **Want to add new event categories or pass tiers?**
  Add the string to the enum in `src/db/schema.ts`, run `npm run db:generate && npm run db:migrate`, and you are done.
* **Want to add Redis caching or WebSockets?**
  Because you are on a standard Node.js server, you can `npm install ioredis socket.io` anytime without edge runtime limitations.

agy --conversation=4a994c4c-cdca-4c20-80fa-701cbdc86662

