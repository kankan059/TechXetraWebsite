# TechXetra Documentation Portal

Welcome to the **TechXetra** documentation portal. This directory contains complete architectural guides, TypeScript definitions, and endpoint-by-endpoint API specifications for building the frontend web application.

---

## ⚡ Quick Start for Frontend Developers

### 1. Environment Variables (`.env.local`)
Add the following to your frontend project's `.env.local`:

```bash
# 1. Backend API Base URL
NEXT_PUBLIC_API_URL=http://localhost:8787

# 2. Google OAuth Client ID (for Google Identity Services SDK)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
```

---

### 2. 🚨 Critical Rule: Session Cookies & `credentials: 'include'`

> [!IMPORTANT]
> **ALL HTTP requests made by the frontend MUST include `credentials: 'include'`.**
>
> The backend does **NOT** use Bearer tokens in headers. Authentication is handled exclusively through secure, signed HttpOnly session cookies (`__Host-session` in production, `session` in local development).
>
> If you omit `credentials: 'include'` from your `fetch` or Axios configuration, the browser will strip the cookie and all authenticated endpoints (`/api/me`, `/api/purchases`, `/api/teams`, etc.) will fail with **HTTP 401 Unauthorized**.

#### Example with Native `fetch`:
```ts
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
  credentials: 'include', // <--- MANDATORY!
  headers: {
    'Content-Type': 'application/json',
  },
})
```

#### Example with Axios:
```ts
import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
  withCredentials: true, // <--- MANDATORY!
})
```

---

### 3. CORS & Origin Port Matching

> [!WARNING]
> The backend strictly enforces CORS and CSRF protection on all state-changing mutations (`POST`, `PUT`, `PATCH`, `DELETE`).
>
> Ensure your frontend local dev server runs on `http://localhost:3000` (the default `FRONTEND_ORIGIN`). If you run on a different port (e.g. `5173` for Vite), update `FRONTEND_ORIGIN` in the backend `.dev.vars` file to match your port.

---

### 4. Running the Backend Locally for Testing
To spin up a local instance of the backend:

```bash
# In the backend directory:
npm install
npm run dev
# The worker starts listening at http://localhost:8787
```

---

## 📚 Documentation Directory

| Document | Description |
|---|---|
| **[`FRONTEND_INTEGRATION_GUIDE.md`](./FRONTEND_INTEGRATION_GUIDE.md)** | **Master Guide**: System architecture, complete TypeScript domain types (`types/api.ts`), copy-paste API client (`lib/api-client.ts`), UI/UX state flows, and error handling matrix. |
| **[`api/01-auth-and-profile.md`](./api/01-auth-and-profile.md)** | Google login, email/password auth, profile completeness checks, and student ID verification locking. |
| **[`api/02-catalog-events-leaderboards.md`](./api/02-catalog-events-leaderboards.md)** | Festival passes, event directory with search & filters, single event details, and public E-Sports scoreboards. |
| **[`api/03-teams-and-invitations.md`](./api/03-teams-and-invitations.md)** | Team creation, email invitations, roster lock rules, and participant team dashboards. |
| **[`api/04-purchases-payments-tickets.md`](./api/04-purchases-payments-tickets.md)** | 15-minute checkout reservation timer, UPI VPA & QR generation, 12-digit UTR submission, and digital tickets with signed QR tokens (`tx1...`). |
| **[`api/05-staff-portal.md`](./api/05-staff-portal.md)** | Volunteer QR barcode scanner PWA (Gate vs Event single-use check-in, physical college ID checks) and E-Sports tournament scoring. |
| **[`api/06-admin-portal.md`](./api/06-admin-portal.md)** | Manual UPI verification queue, user management, event creation & staff assignments, ticket overrides, settings, and reports. |
| **[`GOOGLE_AUTH_GUIDE.md`](./GOOGLE_AUTH_GUIDE.md)** | Google Identity Services button configuration, client ID setup, and One-Tap integration. |
| **[`BACKEND_DEV_GUIDE.md`](./BACKEND_DEV_GUIDE.md)** | Backend engineering architecture, Cloudflare D1 batching, and SQLite invariants. |
