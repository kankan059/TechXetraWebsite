# TASK-06 — Manual UPI submission and payment review state machine

## Objective
Implement UPI instructions, UTR/transaction-ID submission, attempt history, reviewer queue, approve/reject/hold/unhold/withdraw/resubmit, and atomic payment audit. UTR submission never proves payment.

## Source of truth
Architecture spec §§3.5–3.6, §10, §14.1, §15, §17–18.

## Routes
- `GET /api/purchases/:id/payment-instructions`
- `POST /api/purchases/:id/payment` (Idempotency-Key, complete profile, rate limited)
- `GET /api/admin/payments`, `GET /api/admin/payments/:id`
- `POST /api/admin/payments/:id/approve`, `/reject`, `/hold`, `/unhold`, `/resubmit`
- `POST /api/payments/:id/withdraw`

## Rules
1. Payment instructions are owner-only and only for non-expired AWAITING_PAYMENT purchases. Construct a correctly URL-encoded `upi://pay` URI with configured payee/VPA, exact amount, INR currency, and purchase reference. Never return instructions for someone else's purchase.
2. Normalize transaction ID: trim, uppercase, remove spaces; validate `^[A-Z0-9]{8,35}$`. Do not log raw UTRs. UTR is untrusted input.
3. Submit attempt atomically: verify purchase still AWAITING_PAYMENT, insert attempt with expected amount snapshot, transition purchase to PENDING_VERIFICATION, append payment audit. Active-attempt and active-UTR partial unique indexes are authoritative.
4. Same purchase and same UTR retry returns the existing attempt; different UTR while pending returns `PAYMENT_ALREADY_SUBMITTED`. UTR already attached to another active attempt returns `UTR_ALREADY_USED` and a redacted security event.
5. Expired-purchase revival must re-reserve capacity atomically before accepting a UTR. If capacity has been taken, return `RESERVATION_EXPIRED_CONTACT_SUPPORT` and do not store the UTR.
6. PENDING_VERIFICATION purchases do not auto-expire; seats remain reserved. Overdue is a derived flag only.
7. Review queue requires SUPER_ADMIN or `can_review_payments`. Include authorized participant details and all matching-UTR attempts for investigation, oldest first. Do not expose other participants' payment data to participants.
8. Approval Phase A is a single atomic batch: guard pending payment/purchase; prohibit reviewer == purchase owner; transition payment SUCCESS and purchase PAID; confirm RESERVED registrations and LOCKED teams; append payment audit; verify-after-write. Concurrent approvals must result in exactly one approval. Repeating approval returns existing success; if a conflicting rejection won, return conflict.
9. Phase B fulfillment is Task 07. Do not make Phase A depend on successful ticket creation.
10. Reject: mark current attempt FAILED and preserve history; normally return purchase to AWAITING_PAYMENT with configured retry TTL. If `cancel_purchase=true`, call guarded release path. Public rejection reason is safe text; internal note is staff-only.
11. Hold/unhold keeps PENDING_VERIFICATION state and appends audit. Withdraw is participant-owned, only pending and not on hold; it transitions attempt to FAILED/WITHDRAWN and purchase to AWAITING_PAYMENT with a fresh short expiry. Concurrent review/withdraw must have one winner.
12. Staff resubmit creates a new attempt linked to the previous attempt; never overwrite attempt history. Only permitted for a failed attempt whose purchase is not PAID/CANCELLED.
13. Refunds are out of scope. Never add a refund endpoint or imply the backend moves money.

## Tests required — blocking gate
- Duplicate UTR across purchases rejected; same-purchase repeat idempotent.
- Double submission with same key replays response; key reuse with different body gives 422; concurrent in-progress key gets defined conflict.
- Two reviewers approve concurrently: one SUCCESS transition, exactly one approval audit, no duplicate fulfillment trigger side effects.
- Reviewer cannot approve or reject own purchase; unauthorized reviewer blocked.
- Approval cannot be undone by later failure; rejected attempt remains in history; corrected resubmission creates a new row.
- Withdraw/review race has one winner; held payment cannot be withdrawn.
- Late payment revival either reserves seats safely or stores no UTR and returns support error.
- Pending verification never expires through reservation cron logic.
- Audit rows and state transitions roll back together on a failed batch.

## Acceptance criteria
No API path sets SUCCESS except authorized approval (or documented free-purchase path), no self-review, no overwritten attempt history, and all concurrency tests pass.
