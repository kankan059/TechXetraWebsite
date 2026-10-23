# Documentation manifest

Generated from the supplied `backend(3).zip` source archive by inspecting the current `src/app.ts`, `src/routes/`, `src/services/`, `src/common/response.ts`, `src/config/env.ts`, `src/db/`, migrations, and the existing design docs.

Files:
- `README.md`
- `00-OVERVIEW.md`
- `01-API-ROUTE-INDEX.md`
- `02-REQUEST-RESPONSE-CONTRACTS.md`
- `03-PAGES-AND-USER-FLOWS.md`
- `04-FRONTEND-STRUCTURE.md`
- `05-AUTH-SECURITY-AND-ERRORS.md`
- `06-DATA-MODELS-AND-STATES.md`
- `07-INTEGRATION-GAPS.md`
- `08-BACKEND-FILE-INDEX.md`
- `09-FRONTEND-ENDPOINT-MAP.md`
- `MANIFEST.md`

Important: the route index is mechanically extracted; access labels are notes to guide the frontend team, not a replacement for checking middleware and service-level authorization. The backend has not been executed as part of this documentation generation.


## Product-scope clarification

The revised handoff intentionally does not treat missing password-reset, email-verification, or standalone purchase-history features as defects. Missing backend routes are called out only when current frontend code tries to use them or when they block a confirmed existing workflow. The frontend audit is an integration plan, not a feature wishlist.
