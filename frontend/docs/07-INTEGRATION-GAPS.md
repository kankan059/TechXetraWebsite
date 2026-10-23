# 07 — Actionable integration caveats

This file is intentionally limited to issues that affect integrating the **current frontend** with the **current backend**. It is not a wishlist of features that the product does not support.

## Important rules

- Do not create frontend pages for backend features that are absent unless the product owner explicitly requires them.
- Do not add backend endpoints just because a page is missing.
- A route being absent is actionable here only if a current frontend service/page calls it, or if the agreed product workflow depends on it.
- Backend design documents may describe future/planned endpoints. Use the mounted implementation in `src/app.ts` and `src/routes/` as the current API contract.

## Confirmed integration caveats

1. **Verify the API base-path mapping first.** The frontend API client uses `/api/...` paths. The backend mounts its domain routers at `/api/v1` and at the root. Confirm the deployment proxy/rewrite maps the frontend paths to the intended backend handlers. Do not change the base URL and individual paths independently without testing the resulting URL.

2. **Profile update path differs.** The frontend calls `PATCH /api/me/profile`; the backend route is `PATCH /me` (subject to the deployment base-path mapping).

3. **Team invitation path differs.** The frontend calls `/teams/:id/invites`; the backend supports `/teams/:teamId/invitations` and an alias `/teams/:teamId/invite`.

4. **My invitation list path differs.** The frontend calls `/me/team-invites`; the backend supports `/team-invites/mine`.

5. **Payment instructions path differs.** The frontend calls `/purchases/:id/payment-instructions`; the backend supports `GET /purchases/:purchaseId/payment`.

6. **Payment withdrawal paths differ.** The frontend calls `/payments/:paymentId/withdraw`; the backend's withdrawal routes are purchase-scoped. Match the UI arguments and route to the backend handler and do not imply that a particular submission is targeted unless the handler actually uses that submission ID.

7. **Ticket list path differs.** The frontend calls `/tickets/me`; the backend supports `/tickets` and `/tickets/mine`.

8. **Registration list caveat.** The backend's `GET /me/registrations` is currently a placeholder returning an empty list. If the current frontend relies on it, the registrations screen will not show real registrations. Decide which existing backend source should drive that UI or implement the intended registration-list behavior; do not invent a separate purchase-history feature.

9. **Participant API must not expose admin fulfillment retry.** If the frontend participant API wraps `/admin/purchases/:id/retry-fulfillment`, remove that participant-facing call. Fulfillment retry is an administrative recovery action.

10. **Admin payment review contract differs.** The backend supports `POST /admin/payments/:id/decision` and `/review` with a decision payload. The frontend's separate approve/reject/hold-style methods should call the supported endpoint and use its accepted decision values.

11. **Admin event list fallback can hide failures.** The frontend admin event list catches errors and falls back to public events. Remove this fallback or make it an explicit product decision: permission and server errors must not look like successful admin results.

12. **Staff operations with no matching handler.** The current frontend calls staff scan denial and staff payment review paths for which no matching handler was found in the mounted backend. Hide/remove these controls unless the product explicitly requires those workflows and backend routes are added.

13. **Staff scoring methods must match backend methods.** The frontend uses a GET scores endpoint and a PUT scores endpoint. The backend route inventory has a POST score-entry route and match-result endpoints. Align the screen with the actual scoring contract rather than changing HTTP verbs without checking schemas.

14. **Admin actions without matching handlers.** The current frontend has calls for certain gate-staff management, registration cancel/replace, ticket reissue, pre-registration, and extra report endpoints for which no matching route was found in the mounted backend. Do not build around these calls as if they work. Remove/disable the corresponding actions unless the product owner confirms they are required and the backend is extended.

15. **Admin settings read operations.** The frontend settings page expects GET/list operations. The backend route file contains update operations but no matching GET/list handlers for some settings/festival-day data. The current screen must not assume it can load those values from the update endpoints.

16. **Response fields must follow current serializers.** Do not copy field names from the older design docs if the current serializer uses different names. For example, confirm the current event serializer fields such as `festDay`, `seatsRemaining`, and `formSchema`.

17. **Payment is manual UPI review.** Do not show a payment as successful merely because the user submitted a UTR. Show the actual server payment state and only display tickets after the backend has issued them.

18. **Ticket scanning has two separate actions.** Lookup is read-only; admission/check-in is a distinct mutation. The frontend must show the result returned by the server and handle conflicts such as already checked in or wrong event.

## How to resolve each item

For each affected service method, record:
- frontend caller/page;
- current frontend method and path;
- actual backend method and path;
- request schema and response shape;
- whether the page/button should be fixed, removed, or deferred.

Do not add a new feature merely to eliminate a line from this list. The goal is to make the intended current product work with the available backend.
