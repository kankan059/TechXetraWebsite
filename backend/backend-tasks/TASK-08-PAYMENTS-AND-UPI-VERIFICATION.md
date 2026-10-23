# TASK 08: Manual UPI Payments, Verification Queue & Durable Payment Truth

## Objective
Implement manual UPI payment submission (1-click deep links, UTR recording, deduplication), payment withdrawal, the reviewer verification workflow, strict anti-self-dealing rules, and the **Durable Payment Truth invariant**.

---

## 1. UPI Payment Intent & Submission Flow (`src/routes/payments.ts`)

### 1.1 Get UPI Details & 1-Click Intent
* **Endpoint:** `GET /api/purchases/:id/payment`
* **Auth:** `requireAuth()` (enforces purchase ownership)
* **Response:**
  * `upi_vpa`: `env.UPI_VPA`
  * `payee_name`: `env.UPI_PAYEE_NAME`
  * `amount_paise`: Total purchase amount
  * `upi_intent_uri`: Standard URI format for mobile payment apps:
    `upi://pay?pa=<vpa>&pn=<name>&am=<amount_in_rupees>&cu=INR&tn=TechXetra-Order-<purchase_id>`

### 1.2 Submit Bank UTR Number
* **Endpoint:** `POST /api/purchases/:id/payment`
* **Auth:** `requireAuth()`
* **Schema:** `{ transaction_id: string (8-35 alphanumeric), idempotency_key?: string }`
* **Execution Flow:**
  1. Purchase must be `AWAITING_PAYMENT` and reservation not expired.
  2. Normalize UTR: trim, strip spaces/hyphens, convert to uppercase.
  3. **Duplicate UTR Protection:** Check that this UTR is not already in `PENDING` or `SUCCESS` status in the `payments` table.
  4. In a native transaction:
     * Transition `purchases.status` to `PENDING_VERIFICATION` (freezes the 15-minute countdown).
     * Insert row into `payments` (`status: 'PENDING'`).
     * Record entry in `payment_audit_logs`.
* **Response:** `201 Created` with submitted payment status.

### 1.3 Withdraw Payment Submission
* **Endpoint:** `POST /api/purchases/:id/payment/withdraw`
* **Auth:** `requireAuth()`
* **Logic:** If purchase is `PENDING_VERIFICATION`, marks payment as `WITHDRAWN`, and resets purchase back to `AWAITING_PAYMENT` with a **fresh 15-minute reservation timer**.

---

## 2. Reviewer Verification Queue (`src/services/payment.service.ts`)

Reviewers with `can_review_payments = 1`, `SUPER_ADMIN`, or assigned Event Leads can review submissions.

### 2.1 The Anti-Self-Dealing Invariant
* **Rule:** A reviewer can **never** review, approve, reject, or place a hold on their own purchase (`reviewer.id !== purchase.buyer_id`).
* Attempting self-review must throw `403 FORBIDDEN` with code `CANNOT_REVIEW_OWN_PAYMENT`.

### 2.2 Payment Review Actions
* **Endpoint:** `POST /api/admin/payments/:id/review` (or `/api/staff/events/:id/payments/:pid/review`)
* **Schema:** `{ action: 'APPROVE' | 'REJECT' | 'HOLD', rejection_reason?: string, internal_note?: string }`

#### On `REJECT`:
* Set payment `status = 'REJECTED'`.
* Set purchase `status = 'FAILED'`.
* Release event seats and cancel reserved registrations.
* Unlock teams back to `DRAFT`.

#### On `HOLD`:
* Keep purchase in `PENDING_VERIFICATION` and update internal reviewer notes.

#### On `APPROVE`:
Execute within a native PostgreSQL transaction:
1. Set payment `status = 'SUCCESS'`, `reviewed_by = reviewer.id`, `reviewed_at = now`.
2. Set purchase `status = 'PAID'`.
3. **Lock Student Fields:** Set `student_fields_locked = 1` for the buyer and all beneficiaries in this order.
4. Set registrations `status = 'CONFIRMED'`.
5. If team event, set `teams.status = 'CONFIRMED'`.
6. Issue digital tickets for every purchase item.

---

## 3. The "Durable Payment Truth" Invariant

Payment approval represents financial reality. If ticket generation or database insertion encounters an unexpected issue **after** a payment has been verified:
* **NEVER downgrade the purchase back to `AWAITING_PAYMENT` or `UNPAID`.**
* The purchase must remain `status = 'PAID'`.
* Set `purchases.fulfillment_status = 'FAILED'` and record `fulfillment_last_error`.
* Expose an admin endpoint: `POST /api/admin/purchases/:id/retry-fulfillment` to re-attempt ticket generation safely without double-charging or corrupting payment truth.

---

## Verification Checklist
- [ ] Submitting a UTR transitions the purchase to `PENDING_VERIFICATION` and pauses the expiry timer.
- [ ] Submitting a duplicate UTR already in use fails with `409 DUPLICATE_TRANSACTION_ID`.
- [ ] Reviewers cannot approve their own payments (`CANNOT_REVIEW_OWN_PAYMENT`).
- [ ] Approving a student purchase sets `student_fields_locked = 1` across all attendees.
- [ ] If ticket fulfillment throws an error, the purchase remains permanently `PAID`.
