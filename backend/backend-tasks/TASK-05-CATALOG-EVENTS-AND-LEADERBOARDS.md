# TASK 05: Public Pass Catalog, Event Discovery & Leaderboards

## Objective
Implement public-facing catalog endpoints for festival passes, event discovery with multi-parameter filtering, search, pagination, live seat calculations, and public tournament scoreboards with automated round tie-breaking.

---

## 1. Pass Catalog & Global Notices (`src/routes/catalog.ts`)

* **Endpoint:** `GET /api/catalog/passes`
* **Auth:** Public (None)
* **Logic:**
  1. Reads `gate_pass_price_paise`, `gate_pass_student_price_paise`, `purchases_enabled` from the `settings` table.
  2. Queries `fest_days` table ordered by `day_number ASC`.
* **Response:** Returns general and student gate pass prices, festival dates, and purchasing status.

---

## 2. Public Event Discovery (`src/routes/events.ts`)

* **Endpoint:** `GET /api/events`
* **Auth:** Public (None)
* **Query Parameters (Zod Schema):**
  * `category?: EventCategory`
  * `day?: number` (1, 2, or 3)
  * `is_team?: boolean`
  * `search?: string` (case-insensitive search on title and description)
  * `cursor?: string` (base64 cursor for pagination)
  * `limit?: number` (default 20, max 50)
* **Execution Logic:**
  1. Filter out `status = 'DRAFT'` (only `PUBLISHED` events are public).
  2. Apply SQL filters dynamically using Drizzle's `and(...)` conditions.
  3. Order by `fest_day ASC`, `id ASC`.
  4. Compute computed fields:
     * `seats_remaining = Math.max(0, capacity - seats_taken)`
     * `registration_open = status === 'PUBLISHED' && seats_remaining > 0 && (registration_closes_at === null || now < registration_closes_at)`
* **Response:** `{ events: PublicEventResponse[], next_cursor: string | null }`

---

## 3. Single Event Retrieval (`src/routes/events.ts`)

* **Endpoint:** `GET /api/events/:idOrSlug`
* **Auth:** Public (None)
* **Logic:**
  1. Query event by UUID or unique `slug`.
  2. If `status === 'DRAFT'`, check if caller has a valid staff session (`VOLUNTEER`, `LEAD`, `SUPER_ADMIN`). If not, return `404 NOT_FOUND` to hide unreleased events.
  3. Include `form_schema` (custom dynamic questions) if configured.
* **Response:** Full `PublicEventResponse` with live `seats_remaining`.

---

## 4. Public Tournament Leaderboard (`src/routes/leaderboards.ts`)

* **Endpoint:** `GET /api/leaderboards/:eventId`
* **Auth:** Public (None)
* **Business Invariant:** Scoring and leaderboards are strictly restricted to events with `category = 'E_SPORTS'`.
* **Execution Logic:**
  1. Fetch event: verify `category === 'E_SPORTS'` and `leaderboard_public === 1`. If not public, return `403 LEADERBOARD_NOT_PUBLIC`.
  2. Fetch all scores from `esports_scores` for this event joined with `registrations`, `teams`, and `users`.
  3. Aggregate scores per participant/team:
     * Compute `total_score` across all rounds.
     * Collect individual round scores in an array for tie-breaking.
  4. **Tie-Breaking Algorithm:**
     * Sort primarily by `total_score DESC`.
     * If tied, compare the highest single round score.
     * If still tied, compare the second-highest round score, and so on.
  5. Assign integer ranks (`rank: 1, 2, 3...`) handling ties appropriately.
* **Response:**
  ```json
  {
    "event": { "id": "...", "title": "Valorant Tournament", "scoring_status": "FINALIZED" },
    "leaderboard": [
      { "rank": 1, "participant_name": "Team Phoenix", "total_score": 45, "rounds": [15, 15, 15] },
      { "rank": 2, "participant_name": "Team Alpha", "total_score": 42, "rounds": [12, 15, 15] }
    ]
  }
  ```

---

## Verification Checklist
- [ ] `GET /api/catalog/passes` returns live pass pricing.
- [ ] `GET /api/events` hides draft events and correctly filters by category, day, and solo/team.
- [ ] `seats_remaining` is correctly computed as `capacity - seats_taken`.
- [ ] Accessing a non-esports leaderboard returns `400 BAD_REQUEST`.
- [ ] Leaderboard ranks break ties accurately using highest individual round scores.
