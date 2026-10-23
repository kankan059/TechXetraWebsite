# 03 — Existing frontend pages and supported user flows

This guide is for wiring up pages already present in the frontend archive. It does not prescribe new pages merely because an endpoint or common product feature is absent.

## Current page groups found in the frontend

### Public
- `/` — homepage
- `/events`, `/events/directory`, `/events/[slug]`
- Event category pages, event leaderboard pages, `/schedule`, `/leaderboards`
- `/sponsors`, gallery route, `/contact`

### Authentication and participant
- `/login`, `/signup`, `/register`
- `/profile-completion`, `/profile`, `/dashboard`, `/me`
- `/me/teams`, `/me/team-invites`, `/me/registrations`
- `/me/tickets`, `/me/tickets/[id]`
- `/teams`, `/teams/[id]`, `/team`, `/registrations`, `/tickets`, `/tickets/[id]`
- `/checkout`, `/checkout/[id]`, `/checkout/[id]/pay`, `/checkout/[id]/status`

### Staff
- `/staff`, `/staff/scan`, `/staff/events`, `/staff/events/[id]`
- `/staff/events/[id]/registrations`, `/staff/events/[id]/payments`
- `/staff/events/[id]/scores`, `/staff/events/[id]/settings`

### Admin
- `/admin`, `/admin/events`, `/admin/compititions`, `/admin/passes`
- `/admin/payments`, `/admin/registrations`, `/admin/tickets`, `/admin/tickets/[id]`
- `/admin/attendance`, `/admin/users`, `/admin/gate-staff`
- `/admin/reports`, `/admin/audit-logs`, `/admin/settings`

A route file existing does not prove that the page is functional. Use `10-FRONTEND-FUNCTIONALITY-GAP-AUDIT.md` to prioritize actual API mismatches.

## Consolidation decisions

These are possible duplicates to review—not automatic deletion instructions. Inspect links and page contents before changing them.

- Choose `/signup` or `/register` as the canonical registration route and redirect the other if they do the same job.
- Choose `/me` or `/dashboard` as the canonical participant landing page.
- Consolidate `/registrations` with `/me/registrations` if both show the same participant data.
- Consolidate `/tickets` and `/tickets/[id]` with `/me/tickets` and `/me/tickets/[id]` if they duplicate the same ticket wallet.
- Clarify the purpose of `/team`, `/teams`, and `/me/teams`; keep distinct routes only when they serve distinct tasks.
- Fix the spelling of `/admin/compititions` and the gallery route if practical. Use redirects if the old paths may already be linked.
- Review `/test` and remove or protect it if it is developer-only.

## Core participant flow

1. Browse events without authentication.
2. Open event details and display the server-provided event status, availability, pricing, registration window, and form schema.
3. Sign up or sign in using the supported backend auth routes.
4. Load session state from the backend; do not treat local UI state as proof of authorization.
5. Complete profile fields when `profileComplete`/`missingFields` require it.
6. Create a purchase using the backend request schema and a stable idempotency key for retries of that same request.
7. Load payment instructions from the backend and submit UTR/payment evidence using the supported route.
8. Display the actual server payment status. A submitted UTR is not proof of successful payment.
9. Show tickets only after the backend issues them; display the server-issued ticket/QR payload.
10. Handle expired, cancelled, rejected, pending-review, and fulfillment-pending states using server state.

## Team flow

1. Create a team only for an event that supports team registration.
2. Invite using the backend's actual invitation route and request schema.
3. Load invitations from the backend's supported “mine” route.
4. Accept or decline the invitation using the supported invitation identifier.
5. Render membership and team status from server responses, not client assumptions.

## Staff flow

1. Load assigned events.
2. Open the assigned event dashboard and participant list.
3. QR lookup is read-only; check-in/admission is a separate action.
4. Display the exact backend verdict, including already-used, wrong-event, invalid, revoked, and successful outcomes.
5. Do not display unsupported staff payment-review or scan-denial actions unless the backend implements them.

## Admin flow

1. Use Super Admin-authorized routes for payment review, reports, audit logs, user changes, and ticket actions.
2. Align payment decisions with the backend decision endpoint and accepted enum values.
3. Do not rely on public event data as a silent fallback for admin data.
4. Do not display actions for which the backend has no matching route.
5. Show report widgets only for implemented report endpoints.

## Required UI states

For each data-backed page, handle:
- loading and retry;
- empty results;
- server-side validation errors;
- unauthenticated and forbidden states;
- conflict/state-transition errors;
- network/server failures;
- pending payment review and fulfillment;
- cancellation and expiry;
- success only after the server confirms it.

## Security rule

Page guards improve navigation but are not authorization. The backend must enforce access and ownership for every protected operation.
