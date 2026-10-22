# Frontend Implementation Tasks: Event Committee, Dynamic Forms & Admin Controls

Welcome to the frontend tasks registry for **TechXetra 2026**. This directory outlines all specifications, UI wireframes, TypeScript models, and backend HTTP contracts required to build the missing pages and components for the recent backend capabilities.

---

## 🗺️ Task Documents Index

| Document | Topic | Key Frontend Additions |
|---|---|---|
| **[`01-TYPES-AND-SERVICES.md`](./01-TYPES-AND-SERVICES.md)** | Types & API Client Services | Updates to `frontend/types/api.ts`, additions to `frontend/services/staff-api.ts` and `frontend/services/admin-api.ts` |
| **[`02-DYNAMIC-REGISTRATION-FORMS.md`](./02-DYNAMIC-REGISTRATION-FORMS.md)** | Dynamic Registration Questionnaires | Question modal before checkout in `/events/[slug]` and `/teams/[id]`, answer validation, passing `form_responses` to `POST /api/purchases` |
| **[`03-STAFF-EVENTS-HUB-AND-DASHBOARD.md`](./03-STAFF-EVENTS-HUB-AND-DASHBOARD.md)** | Committee Events Hub & Live Dashboard | Assigned events grid at `/staff` or `/staff/events`, event dashboard `/staff/events/[id]` with real-time stats & staff roster |
| **[`04-STAFF-ATTENDEE-ROSTER.md`](./04-STAFF-ATTENDEE-ROSTER.md)** | Attendee & Team Roster Console | Attendee table at `/staff/events/[id]/registrations`, instant search, team info, ticket check-in status, custom form responses popover |
| **[`05-STAFF-PAYMENT-REVIEW.md`](./05-STAFF-PAYMENT-REVIEW.md)** | Event Lead Payment Verification Queue | Payment queue at `/staff/events/[id]/payments`, Lead approval / rejection / hold modals, anti-self-review prevention |
| **[`06-STAFF-EVENT-SETTINGS.md`](./06-STAFF-EVENT-SETTINGS.md)** | Lead Event Configuration & Form Builder | Lead editing at `/staff/events/[id]/settings` for venue, rules, description, deadline, and visual dynamic questionnaire builder |
| **[`07-ADMIN-EVENT-ENHANCEMENTS.md`](./07-ADMIN-EVENT-ENHANCEMENTS.md)** | Super Admin Event Controls & Deletion | Safe delete button with attendee protection, full event update editor, and staff assignment management in `/admin/compititions` |

---

## 🔐 Role-Based Access Control Matrix

The frontend router must protect routes based on the authenticated user's role:

| Feature / Page Path | Super Admin | Event Lead | Event Volunteer | General Participant |
|---|---|---|---|---|
| **My Assigned Events Hub** (`/staff/events`) | Sees All Events | Assigned Only | Assigned Only | Redirect to `/dashboard` |
| **Event Dashboard** (`/staff/events/[id]`) | Yes | Yes (if assigned) | Yes (if assigned) | 403 Forbidden |
| **Attendee Roster** (`/staff/events/[id]/registrations`) | Yes | Yes (if assigned) | Yes (if assigned) | 403 Forbidden |
| **Payment Queue & Review** (`/staff/events/[id]/payments`) | Yes | Yes (if assigned) | 403 Forbidden | 403 Forbidden |
| **Event Settings & Forms** (`/staff/events/[id]/settings`) | Yes | Yes (if assigned) | 403 Forbidden | 403 Forbidden |
| **Fill Dynamic Questionnaire** (Event Checkout) | Yes | Yes | Yes | Yes (Required to checkout) |
| **Safe Event Deletion & Global Edit** (`/admin/compititions`) | Yes | 403 Forbidden | 403 Forbidden | 403 Forbidden |

---

## 🔗 Master Endpoint Cross-Reference

Every frontend task directly communicates with one or more backend API endpoints:

```
Participant Flow
├── POST /api/purchases                             -> 02-DYNAMIC-REGISTRATION-FORMS.md (Includes form_responses)
└── GET /api/registrations/mine                     -> 02-DYNAMIC-REGISTRATION-FORMS.md (Displays submitted answers)

Staff Committee Flow
├── GET /api/staff/events/mine                      -> 03-STAFF-EVENTS-HUB-AND-DASHBOARD.md
├── GET /api/staff/events/:id/dashboard             -> 03-STAFF-EVENTS-HUB-AND-DASHBOARD.md
├── GET /api/staff/events/:id/registrations         -> 04-STAFF-ATTENDEE-ROSTER.md
├── GET /api/staff/events/:id/payments              -> 05-STAFF-PAYMENT-REVIEW.md
├── POST /api/staff/events/:id/payments/:pid/review -> 05-STAFF-PAYMENT-REVIEW.md
└── PATCH /api/staff/events/:id                     -> 06-STAFF-EVENT-SETTINGS.md

Super Admin Flow
├── PATCH /api/admin/events/:id                     -> 07-ADMIN-EVENT-ENHANCEMENTS.md
├── DELETE /api/admin/events/:id                    -> 07-ADMIN-EVENT-ENHANCEMENTS.md
├── GET /api/admin/events/:id/staff                 -> 07-ADMIN-EVENT-ENHANCEMENTS.md
├── POST /api/admin/events/:id/staff                -> 07-ADMIN-EVENT-ENHANCEMENTS.md
└── DELETE /api/admin/events/:id/staff/:userId      -> 07-ADMIN-EVENT-ENHANCEMENTS.md
```

---

## 🚀 Recommended Implementation Order

1. **Step 1 — Foundation**: Implement [`01-TYPES-AND-SERVICES.md`](./01-TYPES-AND-SERVICES.md) so all types, API client methods, and response models are ready.
2. **Step 2 — Checkout Safety**: Implement [`02-DYNAMIC-REGISTRATION-FORMS.md`](./02-DYNAMIC-REGISTRATION-FORMS.md) so users can register for events without hitting backend validation errors.
3. **Step 3 — Staff Portal Core**: Implement [`03-STAFF-EVENTS-HUB-AND-DASHBOARD.md`](./03-STAFF-EVENTS-HUB-AND-DASHBOARD.md) and [`04-STAFF-ATTENDEE-ROSTER.md`](./04-STAFF-ATTENDEE-ROSTER.md) so leads and volunteers can manage their events.
4. **Step 4 — Payment Verification**: Implement [`05-STAFF-PAYMENT-REVIEW.md`](./05-STAFF-PAYMENT-REVIEW.md) so leads can verify UPI payments without burdening the central Super Admin.
5. **Step 5 — Configuration & Admin**: Implement [`06-STAFF-EVENT-SETTINGS.md`](./06-STAFF-EVENT-SETTINGS.md) and [`07-ADMIN-EVENT-ENHANCEMENTS.md`](./07-ADMIN-EVENT-ENHANCEMENTS.md) for full event configuration, deletion, and question builder capabilities.
