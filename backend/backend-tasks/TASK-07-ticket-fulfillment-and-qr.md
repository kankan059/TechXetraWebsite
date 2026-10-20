# TASK-07 — Idempotent ticket fulfillment and signed QR tokens

## Objective
Issue exactly one active ticket per paid purchase item, support safe retries after partial failures, and return deterministic HMAC-signed QR tokens that contain no PII.

## Source of truth
Architecture spec §§4, 10.4, 10.8, 11, §14, §17–18.

## Implementation scope
1. Implement `fulfillPurchase(purchaseId)`. It may only issue tickets when purchase status is PAID. Never issue a ticket for unpaid, pending, cancelled, or expired purchases.
2. Load purchase items without an active ticket; derive ticket type, beneficiary, event, tier, and validity from trusted DB state. Gate pass validity spans fest day 1 start through day 3 end. Event pass validity uses the event's current day-of-event window.
3. Use a single D1 batch for ticket inserts and completion-state update. `ux_tickets_item_active` is the duplicate prevention backstop. Verify every purchase item has an active ticket before setting fulfillment COMPLETE.
4. Catch fulfillment errors separately from payment approval. Record `fulfillment_status='FAILED'`, a short redacted error, and increment attempts. Do not revert `purchases.status='PAID'`, delete approval, or ask the participant to pay again.
5. Add owner retry endpoint `POST /api/purchases/:id/retry-fulfillment`, admin retry route, and cron-callable service entrypoint. Enforce rate limits and ownership/role rules.
6. Implement QR token `tx1.<ticket_id>.<qr_version>.<sig>`, where sig is base64url(HMAC-SHA256(secret, `tx1|ticket_id|qr_version`)) truncated to 22 chars. Use Workers Web Crypto. Verify signatures with constant-time cryptographic verification (`crypto.subtle.verify` where compatible; if the encoded truncated signature prevents direct verify, implement a constant-time byte comparison and document/test it—do not use ordinary string equality for secrets).
7. Reject malformed tokens and invalid signatures before querying ticket data. QR contains no personal/payment details. Database remains source of truth for active/revoked status, purchase paid state, and validity.
8. Implement `GET /api/tickets/me` and `GET /api/tickets/:id` owner-only views including status, derived validity state, purchase reference/payment status, event summary, student-ID warning, and QR token. If paid but fulfillment failed, return a safe “preparing tickets” state and retry affordance.
9. Admin ticket actions (revoke/reissue/rotate QR) can be added in Task 10. Do not implement ticket transfer in this task.

## Tests required
- Fulfillment for unpaid purchase rejected/no-op without ticket creation.
- Multiple concurrent fulfillment retries create exactly one active ticket per item.
- Injected fulfillment failure leaves purchase PAID and retry succeeds.
- Gate and event validity windows match fest days, including UTC conversion.
- QR token valid signature passes; modified ticket ID/version/signature, malformed token, missing secret, and unknown ticket fail safely.
- QR rotation invalidates old token without creating a second ticket.
- Ticket endpoints enforce ownership and never expose other users' PII.
- Student-tier ticket response includes the physical-ID reminder.

## Acceptance criteria
Payment approval remains durable when fulfillment fails, all retries are idempotent, and QR token tests pass. No ticket is created before PAID.
