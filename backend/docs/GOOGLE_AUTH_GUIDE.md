# TechXetra — Google Authentication & Signup Implementation Guide

This guide explains end-to-end how Google OAuth sign-in and sign-up are architected in the TechXetra platform, how the backend processes tokens and sessions, and the exact steps required to integrate Google Login on the frontend.

---

## 1. Architecture & How It Works

Because participant registration in TechXetra requires zero passwords, **Google Login and Google Signup are the exact same flow**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
│  1. User clicks "Sign in with Google"                                  │
│  2. Google Identity Services modal opens                               │
│  3. Google issues signed OpenID Connect ID Token (JWT)                 │
│  4. Frontend sends: POST /api/auth/google { id_token }                 │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                   │
│  5. verifyGoogleIdToken:                                               │
│     - Fetches Google JWKS from https://www.googleapis.com/oauth2/v3/certs
│     - Verifies signature, expiration, issuer (accounts.google.com),    │
│       and audience (GOOGLE_CLIENT_ID)                                  │
│     - Extracts: sub (Google User ID), email, name, avatarUrl           │
│                                                                        │
│  6. resolveOrCreateGoogleUser:                                         │
│     - Case A: User exists with google_sub -> Return user               │
│     - Case B: User pre-registered/invited with email -> Link google_sub│
│     - Case C: Brand new user -> Create PARTICIPANT in D1 database      │
│     - Automatically links any pending team invitations for that email  │
│                                                                        │
│  7. createSession:                                                     │
│     - Generates 32-byte cryptographically random token                 │
│     - Stores SHA-256 hash in D1 `sessions` table (TTL: 30 days)        │
│     - Emits cookie: __Host-session=<token>; HttpOnly; Secure;          │
│                     SameSite=Lax; Path=/                               │
│                                                                        │
│  8. Returns: 200 OK + Formatted User Profile                           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
│  9. Browser automatically stores the HttpOnly session cookie           │
│ 10. Check `user.profile_complete`:                                     │
│     - If FALSE: Show Profile Completion Modal (Phone + Student details)│
│     - If TRUE: Allow full access (Tickets, Teams, Purchases)           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Google Cloud Console Setup (Prerequisite)

Before testing on frontend or backend, obtain an OAuth 2.0 Web Client ID from Google:

### Step 2.1: Create a Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**.
3. Name it (e.g., `TechXetra Fest`) and click **Create**.

### Step 2.2: Configure OAuth Consent Screen
1. In the sidebar, go to **APIs & Services** → **OAuth consent screen**.
2. Select User Type: **External** → click **Create**.
3. Fill in:
   - **App name**: `TechXetra 2026`
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. On the **Scopes** page:
   - Click **Add or Remove Scopes**.
   - Select: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, and `openid`.
5. On the **Test users** page (while app is in Testing mode):
   - Add your own email and any teammate emails you will use for testing.
6. Click **Save and Continue**.

### Step 2.3: Create OAuth Client ID
1. Go to **APIs & Services** → **Credentials**.
2. Click **Create Credentials** → **OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Name: `TechXetra Web App`.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (Next.js dev server)
   - `http://localhost:5173` (Vite dev server, if used)
   - `https://your-fest-domain.com` (Production domain)
6. Under **Authorized redirect URIs**:
   - You can leave this blank when using Google Identity Services (GIS) button callback mode, or add `http://localhost:3000`.
7. Click **Create**.
8. Copy your **Client ID** (it looks like `1234567890-abcdefg.apps.googleusercontent.com`).

---

## 3. Backend Configuration

### 3.1 Configure `wrangler.jsonc`
Open `wrangler.jsonc` and replace the placeholder `GOOGLE_CLIENT_ID`:

```jsonc
{
  "name": "techxetra-backend",
  "vars": {
    "ENVIRONMENT": "development",
    // Paste your Google Client ID here:
    "GOOGLE_CLIENT_ID": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    // Allowed frontend origins: '*' permits all origins
    "FRONTEND_ORIGIN": "*",
    "TICKET_HMAC_SECRET": "local-development-secret-key-32-bytes-minimum!",
    "UPI_VPA": "techxetra@upi",
    "UPI_PAYEE_NAME": "TechXetra 2026"
  }
}
```

> [!NOTE]
> `FRONTEND_ORIGIN` is configured to `*`. In development, this dynamically reflects the caller's `Origin` with `Access-Control-Allow-Credentials: true` so your backend accepts requests from any local port or staging URL without CORS issues.

For production Cloudflare deployments:
```bash
npx wrangler secret put GOOGLE_CLIENT_ID
```

### 3.2 Initialize Local D1 Database
Ensure database migrations are applied locally:
```bash
npx wrangler d1 migrations apply DB --local
npm run dev
```
The backend will run on `http://localhost:8787`.

---

## 4. Frontend Integration Steps

### 4.1 Required Dependencies
If using React or Next.js, install `@react-oauth/google` for clean components, or use the official Google Identity script.

```bash
npm install @react-oauth/google
# or
pnpm add @react-oauth/google
```

Set your environment variables in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```

---

### 4.2 Wrap the Application in the Google Provider
In your root layout or app component (e.g. `src/app/layout.tsx`):

```tsx
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;

  return (
    <html lang="en">
      <body>
        <GoogleOAuthProvider clientId={googleClientId}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
```

---

### 4.3 Build the Google Login Component
Create a reusable login component (e.g. `src/components/auth/GoogleLoginButton.tsx`):

```tsx
'use client';

import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  is_student: boolean;
  institution_name: string | null;
  institution_id: string | null;
  student_fields_locked: boolean;
  role: string;
  can_review_payments: boolean;
  profile_complete: boolean;
  missing_fields: string[];
}

interface Props {
  onSuccess?: (user: UserProfile) => void;
  onProfileIncomplete?: (user: UserProfile) => void;
}

export function GoogleLoginButton({ onSuccess, onProfileIncomplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const idToken = credentialResponse.credential;
      if (!idToken) throw new Error('No ID token returned by Google');

      // Send Google ID token to TechXetra backend
      const response = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // <-- MANDATORY: Allows receiving HttpOnly cookie
        body: JSON.stringify({ id_token: idToken }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || 'Login failed');
      }

      const user: UserProfile = payload.data;

      // Check if user needs to complete their profile
      if (!user.profile_complete) {
        onProfileIncomplete?.(user);
      } else {
        onSuccess?.(user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {loading ? (
        <p className="text-sm text-gray-500">Signing in...</p>
      ) : (
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setErrorMsg('Google Sign-in was cancelled or failed')}
          useOneTap={true}
        />
      )}
      {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
    </div>
  );
}
```

---

### 4.4 The Profile Completion Gate
Every brand-new signup has `profile_complete === false` because a phone number is mandatory.

When `user.profile_complete === false`, the frontend must intercept and render a profile completion modal or redirect to `/me/profile`:

#### Required Fields:
- **`name`**: String (2–100 chars)
- **`phone`**: 10-digit Indian mobile number (`/^[6-9]\d{9}$/`)
- **`is_student`**: Boolean toggle
  - If checked:
    - **`institution_name`**: College/University name (2–100 chars)
    - **`institution_id`**: Roll / Student ID number (1–40 chars)

#### Submitting Profile Updates:
```typescript
async function submitProfile(data: {
  name: string;
  phone: string;
  is_student: boolean;
  institution_name?: string;
  institution_id?: string;
}) {
  const response = await fetch(`${API_BASE}/api/me/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || 'Failed to update profile');
  }

  return payload.data; // Updated UserProfile with profile_complete: true
}
```

> [!WARNING]
> **Student Field Locking Rule**: Once a participant purchases a student-tier pass, the backend sets `student_fields_locked = 1`. If `user.student_fields_locked === true`, the frontend must disable the student toggle, institution name, and ID inputs.

---

### 4.5 Checking Authentication on App Mount
To maintain user login across page refreshes, call `GET /api/me`:

```typescript
export async function fetchCurrentUser(): Promise<UserProfile | null> {
  try {
    const response = await fetch(`${API_BASE}/api/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.status === 401) {
      return null; // Not logged in
    }

    const payload = await response.json();
    return payload.success ? payload.data : null;
  } catch {
    return null;
  }
}
```

---

### 4.6 Logging Out
To log out, call `POST /api/auth/logout`:

```typescript
export async function logoutUser(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  // Clear local client user state and redirect to home page
}
```
This instructs the backend to mark the session as revoked in the database and clear the `__Host-session` cookie in the browser.

---

## 5. Summary Checklist

| Component | Task | Status / Action |
|---|---|---|
| **Google Cloud** | Create OAuth Web Client ID | Add `http://localhost:3000` to Authorized Origins |
| **Backend** | Set `GOOGLE_CLIENT_ID` in `wrangler.jsonc` | Add your Client ID |
| **Backend** | Set `FRONTEND_ORIGIN` in `wrangler.jsonc` | Configured to `*` to allow all origins |
| **Frontend** | Wrap app in `GoogleOAuthProvider` | Provide `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| **Frontend** | Add `credentials: 'include'` | Ensure every fetch call carries the session cookie |
| **Frontend** | Profile Completion Form | Collect phone & student status for new signups |
| **Frontend** | Mount check via `GET /api/me` | Restore user session on app load |
| **Frontend** | Logout button calling `POST /api/auth/logout` | Revoke session & clear cookies |
