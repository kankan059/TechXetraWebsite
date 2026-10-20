# TechXetra Backend — Developer Architecture & Engineering Guide

> **Agent Directive**: This document is a complete, authoritative engineering guide designed to be prompted directly to an AI coding agent (e.g. Cursor, Claude, Antigravity, Devin, Copilot) to understand the architecture, add new features, fix bugs, or write tests without breaking Cloudflare D1 database invariants or financial safety rules.

---

## 1. Non-Negotiable Engineering Invariants

Before writing or modifying any code, the coding agent MUST adhere to these non-negotiable rules:

1. **No Interactive Transactions**: Cloudflare D1 (SQLite) does not support interactive transactions (`BEGIN ... COMMIT`). All atomic multi-statement operations must use `db.batch([stmt1, stmt2, ...])` and the `_guard` table.
2. **The "Verify-After-Write" Invariant**: SQLite conditional `UPDATE` statements that match 0 rows do NOT throw an error. You **must** append a `guardVerifyRow(...)` statement to every conditional write to ensure the batch rolls back if the row wasn't in the expected state.
3. **Monetary Safety**: Never use floating-point numbers for money. All prices, totals, and balances are integers in **paise** (`₹300.00` = `30000`).
4. **Time Safety**: All timestamps are 64-bit integer Unix epoch milliseconds (`Date.now()`). No local timezone strings in the database.
5. **Durable Payment Truth**: Never create tickets before a purchase is `PAID`. If ticket fulfillment fails after payment approval, **never downgrade the purchase back to unpaid**. Payment approval is durable truth; record `fulfillment_status = 'FAILED'` and allow retry.
6. **No Self-Review of Payments**: Reviewers with `can_review_payments` or `SUPER_ADMIN` cannot review or approve their own purchases.
7. **Append-Only Auditing**: `audit_logs`, `payment_audit_logs`, and `esports_score_history` have SQLite triggers that abort on `UPDATE` or `DELETE`. Never write code that attempts to mutate or delete audit rows.
8. **E-Sports Exclusivity**: Scoring and public leaderboards are strictly restricted to events with `category = 'E_SPORTS'` (enforced by SQL check constraint).
9. **Strict Validation**: All HTTP request bodies, query params, and path params must be validated with Zod `.strict()` schemas. Unknown fields must be rejected.
10. **Redaction**: Never log credentials, Google ID tokens, session tokens, HMAC secret keys, phone numbers, or bulk UTR data.

---

## 2. System Overview & Technology Stack

**TechXetra** is the annual technical fest of Tezpur University. The backend provides:
- **Participant Portal APIs**: Google Sign-in, session management, profile completion, gate and event pass purchasing, team creation and invite management, and digital QR ticket access.
- **Manual UPI Payment System**: Zero-fee, direct-to-bank manual UPI flow where users transfer funds via UPI and submit their 12-digit UTR for human review.
- **Volunteer & Gate Check-in**: High-throughput scanning for Gate passes (multi-entry over 3 days) and Event passes (strictly single-use check-in) with physical student ID verification.
- **E-Sports Scoring & Leaderboards**: Real-time round-by-round tournament scorekeeping, tie handling, optimistic concurrency, and public leaderboards.
- **Admin Control & Auditing**: Immutable audit trails, financial reporting, capacity reconciliation, and emergency staff overrides.

### Tech Stack
| Component | Technology | Rationale |
|---|---|---|
| **Runtime** | [Cloudflare Workers](https://workers.cloudflare.com/) | Edge-native, sub-millisecond cold starts, serverless scaling |
| **Framework** | [Hono v4](https://hono.dev/) | Ultra-fast, typed web framework designed for edge runtimes |
| **Database** | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) | Distributed relational database at the edge |
| **Language** | TypeScript (Strict mode) | Complete end-to-end type safety |
| **Validation** | [Zod v3](https://zod.dev/) | Runtime input schema validation with `.strict()` schemas |
| **Auth** | Google OAuth + Opaque Sessions | SHA-256 hashed sessions stored in D1; signed HttpOnly cookies |
| **Cryptography** | Web Crypto API | HMAC-SHA256 signatures for tamper-proof QR tokens |
| **Testing** | [Vitest](https://vitest.dev/) | Concurrency tests mocking D1 batch mechanics |

---

## 3. Repository Structure & Layered Architecture

```
techxetra-backend/
├── backend-tasks/               # Architectural implementation tasks (TASK-00 to TASK-11)
├── docs/                        # Complete backend and frontend documentation guides
├── migrations/                  # Sequential D1 SQL migrations
│   ├── 0001_init.sql            # Core schema, indices, CHECK constraints, triggers, _guard
│   └── 0002_seed.sql            # Seed settings, fest days
├── scripts/
│   └── bootstrap-admin.sql      # Operator script to elevate the first SUPER_ADMIN
├── src/
│   ├── app.ts                   # Hono app factory, global middleware chain, route mounting
│   ├── index.ts                 # Worker entrypoint (fetch + scheduled cron gate)
│   ├── common/                  # Errors, structured logger, standard API response envelope
│   ├── db/                      # D1 atomic batch toolkit, constraints mapping, guard builders
│   ├── middleware/              # Auth, CORS, Security headers, CSRF origin check, Request ID
│   ├── routes/                  # Modular route controllers (public, participant, staff, admin)
│   ├── services/                # Pure business logic and database transaction builders
│   ├── types/                   # Domain entities, D1 types, CloudflareBindings, AppVariables
│   └── utils/                   # QR generation and constant-time HMAC verification
├── tests/                       # Vitest test suite covering all domains and edge cases
├── wrangler.jsonc               # Cloudflare Worker bindings, environment vars, D1 database ID
└── package.json
```

### Architectural Separation of Concerns
1. **`routes/` (Presentation & HTTP Layer)**:
   - Validates input using Zod schemas (`.parse(body)`).
   - Extracts auth context from `c.get('user')` or `c.get('session')`.
   - Calls the appropriate service method.
   - Formats response using `jsonSuccess(c, data, status)` or throws `AppError`.
2. **`services/` (Business Logic & Database Layer)**:
   - Enforces business rules and authorization policies.
   - Prepares SQL statements and constructs batch arrays with guards.
   - Calls `executeBatch(db, statements)` to commit atomic changes.
   - Creates audit records via `createAuditStatement`.
3. **`db/` (Atomicity & Constraint Mapping)**:
   - `guards.ts`: Helper functions (`guardWhen`, `guardUnless`, `guardVerifyRow`).
   - `batch.ts`: `executeBatch` wraps `db.batch()` and maps SQLite errors.
   - `constraints.ts`: Regex mapping of SQLite constraint names to HTTP status codes.

---

## 4. D1 Batch Atomicity & Guard Pattern Cookbook

### 4.1 How D1 Atomicity Works
Cloudflare D1 is SQLite. When you call `db.batch([stmt1, stmt2, ...])`:
- All statements run in a single SQLite transaction.
- If **any** statement fails, the entire batch rolls back.
- If an `UPDATE` matches 0 rows, SQLite does **not** fail.

### 4.2 The `_guard` Table
Table definition in `migrations/0001_init.sql`:
```sql
CREATE TABLE IF NOT EXISTS _guard (
  id INTEGER PRIMARY KEY CHECK (0)
);
```
Inserting into `_guard` always throws `CHECK constraint failed: _guard`, aborting the batch!

### 4.3 Code Recipes for Service Methods

#### Recipe 1: Conditional Update with `guardVerifyRow`
When updating a status (e.g. locking a team from `DRAFT` to `LOCKED`):
```ts
import { executeBatch, guardVerifyRow } from '../db/batch'

export async function lockTeam(db: D1Database, teamId: string, now: number) {
  const statements: D1PreparedStatement[] = [
    // 1. Conditional update
    db.prepare("UPDATE teams SET status = 'LOCKED', updated_at = ? WHERE id = ? AND status = 'DRAFT'")
      .bind(now, teamId),

    // 2. Mandatory verification guard
    guardVerifyRow(db, 'teams', "id = ? AND status = 'LOCKED'", [teamId]),

    // 3. Audit trail
    createAuditStatement(db, {
      actorId: user.id,
      action: 'TEAM_LOCKED',
      targetType: 'TEAM',
      targetId: teamId,
      now,
    })
  ]

  // If the team was not in DRAFT, guardVerifyRow fails and rolls back the batch
  await executeBatch(db, statements, {
    customGuardMessage: 'Team is not in DRAFT status',
  })
}
```

#### Recipe 2: Capacity Increment with `guardWhen`
When reserving seats for an event:
```ts
import { executeBatch, guardWhen } from '../db/batch'

export async function reserveSeat(db: D1Database, eventId: string, seatCount: number) {
  const statements: D1PreparedStatement[] = [
    // Guard fails if seats_taken + seatCount exceeds capacity
    guardWhen(
      db,
      'EXISTS (SELECT 1 FROM events WHERE id = ? AND capacity IS NOT NULL AND seats_taken + ? > capacity)',
      [eventId, seatCount]
    ),

    // Atomically increment seats
    db.prepare('UPDATE events SET seats_taken = seats_taken + ? WHERE id = ?')
      .bind(seatCount, eventId),
  ]

  await executeBatch(db, statements, {
    customGuardMessage: 'Event capacity has been reached',
  })
}
```

---

## 5. Development Cookbook: Adding New Features

### 5.1 Adding a New API Endpoint
1. **Define Schema**: In `src/routes/<domain>.ts`, create a Zod `.strict()` schema:
   ```ts
   const UpdateItemSchema = z.object({
     title: z.string().min(2).max(100),
     description: z.string().max(500).optional(),
   }).strict()
   ```
2. **Define Route Handler**:
   ```ts
   domainRoutes.patch('/:id', requireAuth(), async (c) => {
     const user = c.get('user')!
     const id = c.req.param('id')
     const body = await c.req.json().catch(() => ({}))
     const validated = UpdateItemSchema.parse(body)
     const now = c.get('now') || Date.now()

     const result = await updateDomainItem(c.env.DB, id, validated, user, now)
     return jsonSuccess(c, result)
   })
   ```
3. **Mount in `src/app.ts`** (if adding a new route file):
   ```ts
   app.route('/api/custom-domain', customDomainRoutes)
   ```

### 5.2 Adding a New Database Migration
1. Create a sequential file in `migrations/`:
   `migrations/0003_add_new_feature.sql`
2. Write SQLite statements (use `IF NOT EXISTS` and parameterized patterns).
3. Update `src/types/index.ts` to reflect the new table/column interfaces.
4. If adding new constraints, register them in `src/db/constraints.ts`.
5. Apply locally:
   ```bash
   npx wrangler d1 migrations apply DB --local
   ```

### 5.3 Writing a Vitest Unit/Integration Test
Follow existing tests in `tests/`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { AppError } from '../src/common/errors'

describe('Domain Feature Tests', () => {
  it('throws 409 when condition is violated', async () => {
    const mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
      })),
      batch: vi.fn().mockRejectedValue(new Error('CHECK constraint failed: _guard')),
    } as unknown as D1Database

    await expect(myServiceFunction(mockDb, 'id')).rejects.toMatchObject({
      name: 'AppError',
      status: 409,
      code: 'GUARD_VIOLATION',
    })
  })
})
```

---

## 6. How to Run, Test, and Verify

### Running Locally
```bash
# 1. Install dependencies
npm install

# 2. Apply migrations to local SQLite D1 database
npx wrangler d1 migrations apply DB --local

# 3. Seed superadmin (optional)
npx wrangler d1 execute DB --local --file=./scripts/bootstrap-admin.sql

# 4. Start local development server
npm run dev
```

### Running Tests & Linting
```bash
# Run all Vitest suites
npm test

# Run a specific test file
npx vitest run tests/payments.test.ts

# Type-check TypeScript without emitting
npm run typecheck
```

---

## 7. Roadmap & Pending Tasks Reference

The project was architected through ordered tasks in the `backend-tasks/` directory:
- `TASK-00` to `TASK-10`: Core foundation, auth, events, teams, purchases, manual UPI, tickets, scanning, esports, and admin auditing are fully implemented.
- `TASK-11` (`backend-tasks/TASK-11-cron-security-and-release-gate.md`): Focuses on the scheduled cron jobs in `src/index.ts`:
  1. Expire `AWAITING_PAYMENT` purchases whose reservation has passed.
  2. Retry `PAID` purchases with failed ticket fulfillment.
  3. Seat reconciliation: Compare `events.seats_taken` with active registrations.
  4. Daily cleanup of expired sessions and idempotency keys.

---

## 8. Agent Instructions: What to Include in Pull Requests / Changes

When making contributions:
1. Ensure `npm test` and `npm run typecheck` pass with 0 errors.
2. Do not introduce floating point math for currency.
3. Keep all responses wrapped in `jsonSuccess(c, data)` or throw `AppError`.
4. Ensure audit log entries are dispatched inside the atomic batch for any sensitive write.
