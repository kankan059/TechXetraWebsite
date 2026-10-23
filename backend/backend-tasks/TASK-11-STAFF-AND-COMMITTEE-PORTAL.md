# TASK 11: Event Committee Portal & Attendee Roster Management

## Objective
Implement the scoped staff portal for Event Leads and Volunteers, displaying assigned events, live metrics, attendee rosters with parsed custom form answers, and event-scoped payment approvals.

---

## 1. Scoped Access Control Matrix

| Capability | Super Admin | Event Lead | Event Volunteer | General User |
|---|---|---|---|---|
| View Assigned Events | All Events | Assigned Only | Assigned Only | 403 Forbidden |
| View Live Dashboard & Metrics | Any Event | Assigned Only | Assigned Only | 403 Forbidden |
| View Attendee Rosters & Custom Form Answers | Any Event | Assigned Only | Assigned Only | 403 Forbidden |
| View Event Payment Queue | Any Event | Assigned Only | 403 Forbidden | 403 Forbidden |
| Approve / Reject Event Payments | Yes | Yes (No Self-Review) | 403 Forbidden | 403 Forbidden |
| Update Venue, Description, Rules, Form Schema | Yes | Yes | 403 Forbidden | 403 Forbidden |
| Change Ticket Fees, Dates, Capacity | Yes | 403 Forbidden | 403 Forbidden | 403 Forbidden |

---

## 2. Endpoints Implementation (`src/routes/staff-events.ts`)

### 2.1 List My Assigned Events
* **Endpoint:** `GET /api/staff/events/mine`
* **Auth:** Staff Session (`VOLUNTEER`, `LEAD`, or `SUPER_ADMIN`).
* **Logic:**
  * Super Admin receives all events.
  * Leads and Volunteers receive only events where their `user_id` exists in `event_staff`.
  * Computes live counts: `confirmed_count`, `reserved_count`, `seats_remaining`, and `pending_payments_count`.

### 2.2 Event Live Dashboard
* **Endpoint:** `GET /api/staff/events/:id/dashboard`
* **Auth:** Assigned Staff or Super Admin.
* **Logic:** Returns event metadata, capacity metrics, total checked-in count, and the assigned staff roster.

### 2.3 Attendee & Team Roster
* **Endpoint:** `GET /api/staff/events/:id/registrations`
* **Auth:** Assigned Staff or Super Admin.
* **Query Params:** `search?: string` (searches attendee name, email, or team name).
* **Logic:**
  * Queries `registrations` joined with `users` and `teams`.
  * Includes attendee contact info (`email`, `phone`, `institution_name`), check-in status, and parsed `form_responses` (submitted answers to event questions).

### 2.4 Event-Scoped Payment Review
* **`GET /api/staff/events/:id/payments`**:
  * Auth: Assigned Event Lead or Super Admin.
  * Returns submissions for purchases that contain an item for this event.
* **`POST /api/staff/events/:id/payments/:paymentId/review`**:
  * Auth: Assigned Event Lead or Super Admin.
  * Allows the Lead to `APPROVE`, `REJECT`, or `HOLD` payment.
  * **Strict Anti-Self-Dealing:** The Lead cannot approve their own payment.

### 2.5 Operational Event Updates (Lead Scope)
* **Endpoint:** `PATCH /api/staff/events/:id`
* **Auth:** Assigned Event Lead or Super Admin (Volunteers rejected with `403 FORBIDDEN`).
* **Schema:**
  ```ts
  {
    description?: string,
    venue?: string,
    metadata?: Record<string, any>,
    form_schema?: Array<{ id: string, label: string, type: string, required: boolean }>,
    registration_closes_at?: number
  }
  ```
* **Protection Invariant:** Leads are strictly forbidden from modifying fees, capacity, team sizing, or event category. If any of those fields are submitted, throw `403 FORBIDDEN`.

---

## Verification Checklist
- [ ] Volunteers and Leads can only see their assigned events in `GET /api/staff/events/mine`.
- [ ] Volunteers are blocked from reviewing payments or editing event descriptions.
- [ ] Attendee roster returns submitted custom question answers (`form_responses`).
- [ ] Leads attempting to change ticket fees receive `403 FORBIDDEN`.
- [ ] Leads attempting to approve their own payment receive `403 CANNOT_REVIEW_OWN_PAYMENT`.
