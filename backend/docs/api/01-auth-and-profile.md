# Module 01: Authentication, Profile & Health APIs

This document covers all endpoints related to user authentication, session lifecycle, profile management, profile completeness rules, student verification locking, and API health monitoring.

---

## 1. System Overview & Authentication Architecture

### 1.1 Session Handling & Cookie Security
- The backend uses standard HttpOnly session cookies.
  - In production (`ENVIRONMENT === 'production'`), the cookie name is `__Host-session` (`Secure; HttpOnly; SameSite=Lax; Path=/`).
  - In local development, the fallback cookie name is `session`.
- **Frontend Requirement**: Always include `credentials: 'include'` on all `fetch` / `axios` requests to ensure cookies are sent and received.
- **Session Lifetimes**:
  - `PARTICIPANT`: Defaults to 30 days.
  - Staff (`VOLUNTEER`, `LEAD`, `SUPER_ADMIN`): Defaults to 12 hours for security.
- Sessions are stored in the Cloudflare D1 `sessions` table (SHA-256 hashed token lookup) and validated on each authenticated request.

### 1.2 Profile Completeness & Gate Rules
A user's profile is computed as complete (`profile_complete: true`) only when:
1. `name`: trimmed string length $\ge 2$ characters.
2. `phone`: 10-digit Indian phone number matching `/^[6-9]\d{9}$/` (stored as normalized 10 digits).
3. If `is_student === true`:
   - `institution_name`: trimmed string between 2 and 100 characters.
   - `institution_id`: non-empty string between 1 and 40 characters (e.g. Roll No / Student ID).
   - If `is_student === false`, `institution_name` and `institution_id` are automatically set to `null`.

> **Gate Requirement**: Any action requiring `Profile Complete` (e.g. creating teams, accepting team invites, initiating pass purchases, submitting payments) will reject requests with `403 Forbidden` (`code: 'PROFILE_INCOMPLETE'`) if `profile_complete` is `false`.

### 1.3 Student Fields Locking Rule
- Once a user has a ticket or purchase approved under a **student discount tier**, their `student_fields_locked` flag becomes `true` (`1` in SQLite).
- When `student_fields_locked === true`, any request to `PATCH /api/me/profile` attempting to change `is_student`, `institution_name`, or `institution_id` will be rejected with HTTP `403 Forbidden` (`code: 'STUDENT_FIELDS_LOCKED'`).
- The user can still update their `name` or `phone`.

---

## 2. Health & Readiness Endpoints

### 2.1 Health Check
Checks if the Cloudflare Worker runtime is alive.

- **Method**: `GET`
- **Path**: `/health` (also accessible via `/api/health`)
- **Authentication**: None (Public)
- **Request Headers**: None required

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": 1729432800000
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 2.2 Readiness Check (Database Ping)
Executes a lightweight query (`SELECT 1`) against Cloudflare D1 to ensure the database binding is healthy.

- **Method**: `GET`
- **Path**: `/ready` (also accessible via `/api/ready`)
- **Authentication**: None (Public)
- **Request Headers**: None required

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "ready": true,
    "timestamp": 1729432800000
  },
  "request_id": "req_01j7xyz..."
}
```

#### Error Response
- **Status**: `500 Internal Server Error`
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "Service database is not ready"
  },
  "request_id": "req_01j7xyz..."
}
```

---

## 3. Authentication Endpoints

### 3.1 Google One-Tap / Sign-In with Google
Exchanges a Google OAuth ID token for a secure backend session cookie and user profile.

- **Method**: `POST`
- **Path**: `/api/auth/google`
- **Authentication**: None (Public)
- **Request Headers**:
  - `Content-Type: application/json`
  - `Origin: <FRONTEND_ORIGIN>` (Required for CSRF protection)

#### Request Body Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `id_token` | `string` | **Yes** | Google ID Token returned by Google Identity Services SDK (`credential` response) |

```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEy..."
}
```

#### Success Response
Sets HttpOnly session cookie in the `Set-Cookie` header and returns the user profile.
- **Status**: `200 OK`
- **Header**: `Set-Cookie: __Host-session=<token>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
```json
{
  "success": true,
  "data": {
    "id": "usr_01j8k92b4m10ac",
    "email": "student@tezu.ac.in",
    "name": "Priyanku Sharma",
    "avatar_url": "https://lh3.googleusercontent.com/a/...",
    "phone": null,
    "is_student": false,
    "institution_name": null,
    "institution_id": null,
    "student_fields_locked": false,
    "role": "PARTICIPANT",
    "can_review_payments": false,
    "profile_complete": false,
    "missing_fields": ["phone"]
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request body is missing `id_token` or contains unexpected extra fields. |
| `401` | `UNAUTHORIZED` | Google ID token is invalid, expired, signature failed, or audience mismatch. |
| `403` | `ACCOUNT_DISABLED` | This account has been deactivated by an administrator. |

---

### 3.2 Register with Email & Password
Creates a local account with email and password, creates an authenticated session, sets cookie, and returns the user profile.

- **Method**: `POST`
- **Path**: `/api/auth/register`
- **Authentication**: None (Public)
- **Request Headers**:
  - `Content-Type: application/json`
  - `Origin: <FRONTEND_ORIGIN>`

#### Request Body Schema
| Field | Type | Required | Validation Rules |
|---|---|---|---|
| `email` | `string` | **Yes** | Valid email address format |
| `password` | `string` | **Yes** | Minimum 8 characters, maximum 128 characters |
| `name` | `string` | **Yes** | Trimmed, minimum 2 characters, maximum 100 characters |

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!",
  "name": "Jane Doe"
}
```

#### Success Response
- **Status**: `201 Created`
- **Header**: `Set-Cookie: __Host-session=...`
```json
{
  "success": true,
  "data": {
    "id": "usr_01j8k92b4m10ac",
    "email": "user@example.com",
    "name": "Jane Doe",
    "avatar_url": null,
    "phone": null,
    "is_student": false,
    "institution_name": null,
    "institution_id": null,
    "student_fields_locked": false,
    "role": "PARTICIPANT",
    "can_review_payments": false,
    "profile_complete": false,
    "missing_fields": ["phone"]
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Email invalid, name too short/long, or password < 8 characters. |
| `409` | `EMAIL_ALREADY_EXISTS` | An account with this email is already registered. |
| `409` | `ACCOUNT_CONFLICT` | Account already registered via Google Sign-In without a password. |

---

### 3.3 Login with Email & Password
Authenticates an existing email/password user, creates a session, sets cookie, and returns user profile.

- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Authentication**: None (Public)
- **Request Headers**:
  - `Content-Type: application/json`
  - `Origin: <FRONTEND_ORIGIN>`

#### Request Body Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | **Yes** | Registered email address |
| `password` | `string` | **Yes** | Account password |

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

#### Success Response
- **Status**: `200 OK`
- **Header**: `Set-Cookie: __Host-session=...`
```json
{
  "success": true,
  "data": {
    "id": "usr_01j8k92b4m10ac",
    "email": "user@example.com",
    "name": "Jane Doe",
    "avatar_url": null,
    "phone": "9876543210",
    "is_student": true,
    "institution_name": "Tezpur University",
    "institution_id": "CSB22001",
    "student_fields_locked": false,
    "role": "PARTICIPANT",
    "can_review_payments": false,
    "profile_complete": true,
    "missing_fields": []
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `401` | `UNAUTHORIZED` | Invalid email or password. |
| `403` | `ACCOUNT_DISABLED` | Account has been deactivated by administrator. |
| `409` | `ACCOUNT_CONFLICT` | User registered via Google OAuth and has not configured a password. Prompt user to log in with Google. |

---

### 3.4 Logout
Revokes the current session in Cloudflare D1 and clears the browser session cookie.

- **Method**: `POST`
- **Path**: `/api/auth/logout`
- **Authentication**: Session Required (safe if already logged out)
- **Request Headers**:
  - `Cookie: __Host-session=<token>`
  - `Origin: <FRONTEND_ORIGIN>`

#### Success Response
- **Status**: `200 OK`
- **Header**: `Set-Cookie: __Host-session=; Path=/; HttpOnly; Secure; Max-Age=0` (or `session=; ...`)
```json
{
  "success": true,
  "data": {
    "logged_out": true
  },
  "request_id": "req_01j7xyz..."
}
```

---

## 4. Current User & Profile Management (`/api/me`)

### 4.1 Get Current User Profile
Retrieves the logged-in user's profile, roles, permissions, completeness checklist, and student lock status.

- **Method**: `GET`
- **Path**: `/api/me`
- **Authentication**: Session Required
- **Request Headers**:
  - `Cookie: __Host-session=<token>`

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "usr_01j8k92b4m10ac",
    "email": "participant@tezu.ac.in",
    "name": "Jane Doe",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "phone": "9876543210",
    "is_student": true,
    "institution_name": "Tezpur University",
    "institution_id": "CSB22001",
    "student_fields_locked": false,
    "role": "PARTICIPANT",
    "can_review_payments": false,
    "profile_complete": true,
    "missing_fields": []
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `401` | `UNAUTHORIZED` | No session cookie sent or session is invalid/expired. |
| `403` | `ACCOUNT_DISABLED` | Account has been marked inactive by an admin. |

---

### 4.2 Update User Profile
Updates profile fields. Recalculates `profile_complete` and sets `profile_completed_at` timestamp if now complete.

- **Method**: `PATCH`
- **Path**: `/api/me/profile`
- **Authentication**: Session Required
- **Request Headers**:
  - `Content-Type: application/json`
  - `Cookie: __Host-session=<token>`
  - `Origin: <FRONTEND_ORIGIN>`

#### Request Body Schema
All fields are optional. Unknown fields are rejected (`.strict()`).
| Field | Type | Validation Rules | Description |
|---|---|---|---|
| `name` | `string` | 2 to 100 characters | Full participant name |
| `phone` | `string` | Indian format: 10 digits starting with 6, 7, 8, 9 (e.g. `9876543210` or `+919876543210`) | Mobile phone number |
| `is_student` | `boolean` | `true` or `false` | Whether attendee qualifies for student pricing |
| `institution_name` | `string \| null` | 2 to 100 characters when provided | College / University name |
| `institution_id` | `string \| null` | 1 to 40 characters when provided | Student ID / Roll number |

```json
{
  "name": "Jane Doe",
  "phone": "9876543210",
  "is_student": true,
  "institution_name": "Tezpur University",
  "institution_id": "CSB22001"
}
```

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "usr_01j8k92b4m10ac",
    "email": "participant@tezu.ac.in",
    "name": "Jane Doe",
    "avatar_url": null,
    "phone": "9876543210",
    "is_student": true,
    "institution_name": "Tezpur University",
    "institution_id": "CSB22001",
    "student_fields_locked": false,
    "role": "PARTICIPANT",
    "can_review_payments": false,
    "profile_complete": true,
    "missing_fields": []
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Field validation failed (e.g. invalid phone number, name < 2 chars). |
| `401` | `UNAUTHORIZED` | Session expired or missing. |
| `403` | `STUDENT_FIELDS_LOCKED` | Attempted to update `is_student`, `institution_name`, or `institution_id` while `student_fields_locked` is `true`. Prompt user to contact festival administration. |

---

### 4.3 Get My Teams (`/api/me/teams`)
Retrieves all teams the current user is part of (as leader or accepted member).
*Detailed specification available in [Module 03: Teams and Invitations](./03-teams-and-invitations.md).*

### 4.4 Get My Pending Invites (`/api/me/team-invites`)
Retrieves all pending team invitations sent to the user's email or user ID.
*Detailed specification available in [Module 03: Teams and Invitations](./03-teams-and-invitations.md).*

### 4.5 Get My Digital Tickets (`/api/me/tickets`)
Retrieves all digital passes and tickets owned by the current user, along with any currently preparing tickets.
*Detailed specification available in [Module 04: Purchases, Payments & Tickets](./04-purchases-payments-tickets.md).*
