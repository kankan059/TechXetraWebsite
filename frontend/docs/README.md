# TechXetra Frontend Team Handoff

This documentation is based on the supplied backend and frontend archives. It is intended to help the frontend team connect the **product functionality already chosen for TechXetra** to the backend implementation.

## Read in this order

1. `00-OVERVIEW.md` — API conventions and environment configuration.
2. `01-API-ROUTE-INDEX.md` — routes actually mounted by the backend.
3. `02-REQUEST-RESPONSE-CONTRACTS.md` — request/response contracts.
4. `10-FRONTEND-FUNCTIONALITY-GAP-AUDIT.md` — comparison of the current frontend with the backend and prioritized changes.
5. `09-FRONTEND-ENDPOINT-MAP.md` — feature-to-endpoint reference.
6. `03-PAGES-AND-USER-FLOWS.md` — intended pages and functional journeys.
7. `04-FRONTEND-STRUCTURE.md` — suggested structure.
8. `05-AUTH-SECURITY-AND-ERRORS.md` — authentication, authorization, and errors.
9. `06-DATA-MODELS-AND-STATES.md` — data models and states.
10. `07-INTEGRATION-GAPS.md` — only actionable implementation mismatches and caveats.
11. `08-BACKEND-FILE-INDEX.md` — backend file map.
12. `MANIFEST.md` — contents and scope.

## Product-scope rule

**A missing backend route is not automatically a frontend requirement.** Do not add pages, buttons, API calls, or backend work just because a possible feature is absent. Only implement functionality that the product owner has decided to support.

For this handoff, classify findings as:

- **Broken/mismatched:** the current frontend calls an incorrect path/method, sends the wrong payload, or mishandles the response for a supported feature.
- **Missing UI for existing capability:** the backend supports a capability that the intended product needs, but the frontend does not expose it.
- **Unnecessary/duplicate UI:** a page, button, or route is redundant or has no intended user task.
- **Product decision required:** the feature's desirability is unknown. Do not implement it until the product owner decides.

Do not report absent password reset, email verification, purchase-history pages, or other unrequested capabilities as defects merely because they are not implemented. Mention an unsupported backend route only when the **current frontend attempts to use it** or a confirmed product requirement depends on it.

## Source-of-truth and limitations

The backend implementation is the source of truth for currently available API behavior. Existing design documents may describe planned functionality; they are not proof that a route exists. The frontend archive is the source of truth for which pages and service calls currently exist.

This is a static source review. The backend/frontend were not run together, and requests have not been verified against the live deployment. Confirm the deployed base URL/rewrite and run integration tests before release.
