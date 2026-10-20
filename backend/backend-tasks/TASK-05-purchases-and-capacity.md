# TASK-05 — Purchase creation, pricing snapshots, seat reservation, release

## Objective
Implement the most correctness-sensitive write path: create one purchase for one or more gate/event passes, compute prices on the server, reserve event capacity atomically, and safely release reservations on cancellation/expiry.

## Source of truth
Architecture spec §§3–5, §§9.1–9.5, §18 cases 1–3 and 9.

## Required route/service scope
- `POST /api/purchases` (Idempotency-Key; complete profile required)
- `GET /api/purchases`, `GET /api/purchases/:id` (owner only)
- `POST /api/purchases/:id/cancel`
- `GET /api/registrations` (own registrations, including team-related)
- reusable `createPurchase` and `releasePurchase` service functions

## Purchase preconditions and pricing
1. Reject if `settings.purchases_enabled != '1'`, profile incomplete, more than 10 items, duplicate item slots, or user has 3 or more open purchases.
2. Gate pass is for the buyer only and valid across all three fest days. Event pass is for one beneficiary per event and valid only on that event's fest day. A person holding an event pass need not buy a gate pass for that day.
3. Client sends only item type/event/team identifiers and policy acknowledgement. Ignore/reject client prices, tiers, statuses, beneficiary IDs, registration IDs, and validity dates.
4. Compute STUDENT tier only if beneficiary `is_student=1` and `institution_id` is present; otherwise GENERAL. For event prices, student price falls back to general price when null. Use integer paise only.
5. Team purchase: leader only; DRAFT team; accepted member count within bounds; no pending invites; every accepted member has complete profile. PER_PARTICIPANT prices each beneficiary independently. PER_TEAM charges one team price on leader's item and zero on other members' items; student tier only when every accepted member qualifies as student.
6. Snapshot tier and unit price into `purchase_items`. Price/profile changes later must not alter the purchase.
7. If any item uses STUDENT tier, require `acknowledge_student_id_policy: true`, store timestamp, and include the warning in the response.
8. Natural idempotency: same user + exact same open item set returns the existing purchase. Also implement the documented `Idempotency-Key` algorithm through the shared middleware/service; same key with different request hash is 422.

## Atomic create batch
- Recheck critical preconditions inside the batch with `_guard` (purchases enabled, active buyer, event still open/not past close, team still DRAFT and accepted roster unchanged).
- Insert purchase and registrations (`RESERVED`).
- Increment each event's `seats_taken` inside the same batch; rely on `ck_events_capacity` to roll back the whole purchase on a last-seat race.
- Insert purchase items for each beneficiary; use one shared registration ID for team members when applicable.
- Lock team(s) conditionally and verify-after-write.
- For total > 0, set `AWAITING_PAYMENT` and reservation expiry. For total = 0, use the free fast path: set purchase `PAID`, registrations `CONFIRMED`, `payment_method='FREE'`, audit `AUTO_APPROVED_FREE`, then invoke fulfillment hook (Task 07). Never create tickets in this task.

## Release semantics
Implement `releasePurchase(purchaseId, newStatus, reason)` using one guarded batch. It must:
- Only release AWAITING_PAYMENT or PENDING_VERIFICATION purchases.
- Decrement seats only for RESERVED registrations before changing their status, and avoid double-counting shared team registration IDs.
- Mark registrations CANCELLED/EXPIRED, set `purchase_items.holds_slot=0`, unlock locked teams, transition purchase, fail any pending attempt as CANCELLED, and write audit records in the same batch.
- Be safe under concurrent cancellation and cron expiry; a confirmed registration must never be released.

## Tests required — blocking gate
- Capacity=1 with 20 parallel purchases: exactly one succeeds; 19 receive CAPACITY_FULL; seats_taken=1.
- Purchase containing available + full event rolls back completely: no purchase/items/registrations/counter change left behind.
- Same user double-submits same item set with same/different idempotency keys: one active purchase/slot only.
- Price tier calculations, mixed-student PER_TEAM rule, snapshots unaffected by later price changes.
- Gate/event slot uniqueness, duplicate items rejected, client-sent price ignored.
- Cancellation + expiry concurrently decrements seats once; CONFIRMED registration is not released.
- Zero-price purchase confirms registration and enters retryable fulfillment path without UPI.
- Student warning acknowledgement required when applicable.

## Acceptance criteria
Do not proceed to Task 06 until all capacity/atomicity tests pass on Miniflare-backed D1 with `Promise.all`. If guard behavior or rollback differs, stop and fix the foundation; do not weaken tests.
