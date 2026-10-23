# TASK 02: PostgreSQL Schema, Drizzle Models & Initial Migrations

## Objective
Define the complete database schema in Drizzle ORM (`src/db/schema.ts`) matching all 14 entities and tables from `backend/structure/04-DATABASE-SCHEMA-AND-CONSTRAINTS.md`. Generate and execute PostgreSQL migrations and initial seed data.

---

## 1. PostgreSQL Schema Mapping & Drizzle Definitions (`src/db/schema.ts`)

Define all tables, columns, indexes, and constraints using `drizzle-orm/pg-core`:

### 1.1 Enums
* `user_role`: `'PARTICIPANT'`, `'VOLUNTEER'`, `'LEAD'`, `'SUPER_ADMIN'`
* `event_category`: `'TECHNICAL'`, `'CULTURAL'`, `'E_SPORTS'`, `'MANAGEMENT'`, `'LITERARY'`, `'SPORTS'`, `'WORKSHOP'`, `'OTHER'`
* `event_status`: `'DRAFT'`, `'PUBLISHED'`, `'CANCELLED'`, `'COMPLETED'`
* `price_model`: `'PER_PARTICIPANT'`, `'PER_TEAM'`
* `capacity_unit`: `'SEATS'`, `'TEAMS'`
* `scoring_status`: `'OPEN'`, `'FINALIZED'`
* `team_status`: `'DRAFT'`, `'LOCKED'`, `'CONFIRMED'`, `'CANCELLED'`
* `team_member_role`: `'LEADER'`, `'MEMBER'`
* `team_member_status`: `'INVITED'`, `'ACCEPTED'`, `'REJECTED'`, `'REMOVED'`
* `purchase_status`: `'AWAITING_PAYMENT'`, `'PENDING_VERIFICATION'`, `'PAID'`, `'FAILED'`, `'CANCELLED'`, `'EXPIRED'`
* `item_type`: `'GATE_PASS'`, `'EVENT_PASS'`
* `payment_status`: `'PENDING'`, `'SUCCESS'`, `'REJECTED'`, `'WITHDRAWN'`
* `ticket_status`: `'ACTIVE'`, `'CANCELLED'`, `'REPLACED'`, `'EXPIRED'`
* `ticket_tier`: `'GENERAL'`, `'STUDENT'`

---

### 1.2 Table Specifications

1. **`users`**:
   * `id`: `varchar(32)` PRIMARY KEY (Format `TX26XXXX`)
   * `google_sub`: `text` UNIQUE (nullable)
   * `email`: `text` UNIQUE NOT NULL (lowercased)
   * `password_hash`: `text` (nullable, for PBKDF2)
   * `name`: `text` NOT NULL
   * `avatar_url`: `text` (nullable)
   * `phone`: `varchar(15)` (nullable)
   * `is_student`: `smallint` NOT NULL DEFAULT 0 (0 or 1)
   * `institution_name`: `text` (nullable)
   * `institution_id`: `text` (nullable)
   * `student_fields_locked`: `smallint` NOT NULL DEFAULT 0
   * `role`: `user_role` NOT NULL DEFAULT 'PARTICIPANT'
   * `can_review_payments`: `smallint` NOT NULL DEFAULT 0
   * `is_active`: `smallint` NOT NULL DEFAULT 1
   * `profile_completed_at`: `bigint` (nullable, Unix ms)
   * `created_at`: `bigint` NOT NULL (Unix ms)
   * `updated_at`: `bigint` NOT NULL (Unix ms)

2. **`sessions`**:
   * `id`: `varchar(64)` PRIMARY KEY (SHA-256 hex digest of raw token)
   * `user_id`: `varchar(32)` NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
   * `role`: `user_role` NOT NULL
   * `expires_at`: `bigint` NOT NULL (Unix ms)
   * `revoked_at`: `bigint` (nullable, Unix ms)
   * `created_at`: `bigint` NOT NULL (Unix ms)
   * `last_seen_at`: `bigint` NOT NULL (Unix ms)
   * Index: `idx_sessions_user_id` on `(user_id)`

3. **`fest_days`**:
   * `day_number`: `integer` PRIMARY KEY (1, 2, 3)
   * `date`: `varchar(10)` NOT NULL (YYYY-MM-DD)
   * `valid_from`: `bigint` NOT NULL (Unix ms)
   * `valid_to`: `bigint` NOT NULL (Unix ms)

4. **`events`**:
   * `id`: `uuid` PRIMARY KEY
   * `slug`: `text` UNIQUE NOT NULL
   * `title`: `text` NOT NULL
   * `category`: `event_category` NOT NULL
   * `fest_day`: `integer` (nullable) REFERENCES `fest_days(day_number)`
   * `price_paise`: `integer` NOT NULL DEFAULT 0
   * `student_price_paise`: `integer` NOT NULL DEFAULT 0
   * `price_model`: `price_model` NOT NULL DEFAULT 'PER_PARTICIPANT'
   * `is_team`: `smallint` NOT NULL DEFAULT 0
   * `min_team_size`: `integer` (nullable)
   * `max_team_size`: `integer` (nullable)
   * `capacity`: `integer` NOT NULL
   * `seats_taken`: `integer` NOT NULL DEFAULT 0
   * `capacity_unit`: `capacity_unit` NOT NULL DEFAULT 'SEATS'
   * `status`: `event_status` NOT NULL DEFAULT 'DRAFT'
   * `scoring_status`: `scoring_status` NOT NULL DEFAULT 'OPEN'
   * `leaderboard_public`: `smallint` NOT NULL DEFAULT 0
   * `volunteers_can_score`: `smallint` NOT NULL DEFAULT 0
   * `form_schema`: `jsonb` (nullable, dynamic registration questions)
   * Check constraint: `CHECK (category = 'E_SPORTS' OR scoring_status = 'OPEN')`
   * Check constraint: `CHECK (seats_taken <= capacity)`

5. **`event_staff` & `gate_staff`**:
   * `event_staff`: `(event_id, user_id, role, created_at)` with composite primary key.
   * `gate_staff`: `(user_id, created_at)` with primary key on `user_id`.

6. **`teams` & `team_members`**:
   * `teams`: `id` (uuid), `event_id` REFERENCES `events(id)`, `name` (text), `leader_id` REFERENCES `users(id)`, `status` (`team_status`), `created_at`, `updated_at`. Unique index on `(event_id, lower(name))` where status != 'CANCELLED'.
   * `team_members`: `id` (uuid), `team_id` REFERENCES `teams(id)`, `user_id` (nullable, resolved on registration), `invited_email` (text NOT NULL), `role` (`LEADER`/`MEMBER`), `status` (`INVITED`/`ACCEPTED`/`REJECTED`/`REMOVED`), `responded_at`, `created_at`.

7. **`purchases` & `purchase_items`**:
   * `purchases`: `id` (uuid), `buyer_id` REFERENCES `users(id)`, `total_amount_paise` (integer), `status` (`purchase_status`), `reservation_expires_at` (bigint), `fulfillment_status` (`text`), `fulfillment_last_error` (`text`), `idempotency_key` (text UNIQUE), `created_at`, `updated_at`.
   * `purchase_items`: `id` (uuid), `purchase_id` REFERENCES `purchases(id)`, `item_type` (`item_type`), `event_id` (nullable), `team_id` (nullable), `beneficiary_id` (nullable), `unit_price_paise` (integer), `tier` (`ticket_tier`), `created_at`.

8. **`registrations`**:
   * `id` (uuid), `event_id` REFERENCES `events(id)`, `team_id` (nullable), `participant_id` REFERENCES `users(id)`, `purchase_item_id` REFERENCES `purchase_items(id)`, `status` (`text`), `seat_count` (integer), `form_responses` (`jsonb`), `created_at`, `updated_at`.
   * Unique constraint: Partial index on `(event_id, participant_id)` where status IN ('RESERVED', 'CONFIRMED').

9. **`payments` & `payment_audit_logs`**:
   * `payments`: `id` (uuid), `purchase_id` REFERENCES `purchases(id)`, `amount_paise` (integer), `payment_method` (`text`), `transaction_id` (`text`), `status` (`payment_status`), `reviewed_by` (nullable), `reviewed_at` (nullable), `created_at`, `updated_at`.
   * Partial unique index: `transaction_id` UNIQUE WHERE `status IN ('PENDING', 'SUCCESS')`.
   * `payment_audit_logs`: append-only tracking (`payment_id`, `actor_id`, `from_status`, `to_status`, `notes`, `created_at`).

10. **`tickets` & `check_in_logs`**:
    * `tickets`: `id` (uuid), `purchase_item_id`, `beneficiary_id`, `item_type`, `event_id`, `tier`, `status`, `qr_version` (integer default 1), `valid_from`, `valid_to`, `event_checked_in_at` (nullable), `created_at`, `updated_at`.
    * `check_in_logs`: `id` (uuid), `ticket_id`, `scanned_by`, `context` ('GATE' | 'EVENT'), `event_id`, `verdict` ('ADMITTED' | 'DENIED'), `notes`, `created_at`.
    * Partial unique index: Single check-in per event: `(ticket_id, event_id)` UNIQUE WHERE `verdict = 'ADMITTED' AND context = 'EVENT'`.

11. **`esports_scores` & `esports_score_history`**:
    * `esports_scores`: `(event_id, registration_id, round_no)` composite unique, `score` (numeric/integer), `version` (integer default 1), `recorded_by`, `updated_at`.
    * `esports_score_history`: append-only log with trigger or service write.

12. **`settings`, `audit_logs`, `idempotency_keys`**:
    * `settings`: key-value store for `gate_pass_price_paise`, `purchases_enabled`, `support_email`.
    * `audit_logs`: immutable audit trail (`actor_id`, `action`, `target_type`, `target_id`, `details` jsonb, `created_at`).
    * `idempotency_keys`: `(key, status, response_body, expires_at)`.

---

## 2. Drizzle Configuration & Migration Commands

Create `drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit'
import { env } from './src/config/env'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
```

Add migration scripts to `package.json`:
* `"db:generate": "drizzle-kit generate"`
* `"db:migrate": "drizzle-kit migrate"`
* `"db:seed": "tsx src/db/seed.ts"`

---

## 3. Initial Seed Data (`src/db/seed.ts`)
* Seed Fest Days 1, 2, and 3 with start and end timestamps.
* Seed Default Settings (`purchases_enabled = true`, `gate_pass_price_paise = 30000`, `gate_pass_student_price_paise = 15000`).
* Seed Super Admin user account (if `SUPER_ADMIN_EMAIL` is specified).

---

## Verification Checklist
- [ ] `npm run db:generate` generates SQL migration files.
- [ ] `npm run db:migrate` applies migrations to the local PostgreSQL database cleanly.
- [ ] Partial unique indexes (`active_utr`, `event_checkin_once`, `participant_registration`) are created properly.
- [ ] `npm run db:seed` inserts initial fest days and default settings.
