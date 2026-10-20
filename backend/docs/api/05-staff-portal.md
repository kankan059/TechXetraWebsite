# Module 05: Staff Scanner & E-Sports Scoring APIs

This document covers all endpoints intended for festival volunteers, staff leads, and gate checkers: the high-throughput QR ticket check-in scanner and the real-time round-by-round tournament scoring system.

---

## 1. Staff Scanner PWA (`/api/staff/scan`)

### 1.1 Architecture & Security Rules
- **Scanner Role Authorization**: Caller must have a valid session with role `VOLUNTEER`, `LEAD`, or `SUPER_ADMIN`.
  - For **GATE** context: Caller must be assigned in `gate_staff` or be `SUPER_ADMIN`.
  - For **EVENT** context: Caller must be assigned to that event in `event_staff` or be `SUPER_ADMIN`.
- **HMAC Signature Check**: Every scan request cryptographically validates the token (`tx1.<id>.<ver>.<sig>`) using Web Crypto HMAC-SHA256. Tampered or counterfeit QR codes fail immediately with `401 INVALID_QR_SIGNATURE`.
- **Student ID Verification Rule**: If the ticket tier is `STUDENT`, the attendee **must physically show their college ID**. The scanner UI will display `requires_id_check: true`. The `admit` request **must** send `student_id_checked: true`, otherwise admission is rejected.
- **Single-Use Check-In for Events**: An event ticket can only be admitted **once**. Any subsequent attempt will be rejected with HTTP `409 ALREADY_CHECKED_IN` (enforced by partial unique SQLite index).
- **Multi-Entry for Gate**: Gate passes can be scanned multiple times across all 3 festival days. However, if scanned again within 15 minutes at the gate, the backend returns a warning to alert against badge pass-backs.
- **Built-in Rate Limiting**: The scanner endpoint enforces a rate limit of 120 scans/minute per staff member.

---

### 1.2 Lookup Ticket (Pre-Admit Inspection)
Decodes the QR token, checks signatures and validity, and returns attendee details and admission verdict.
- **Does not mutate database state.** Safe to call on camera QR detection.

- **Method**: `POST`
- **Path**: `/api/staff/scan/lookup`
- **Authentication**: Staff Session Required
- **Request Headers**:
  - `Content-Type: application/json`
  - `Cookie: __Host-session=<token>`
  - `Origin: <FRONTEND_ORIGIN>`

#### Request Body Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | **Yes** | Scanned QR token string (`tx1...`, 5 to 300 characters) |
| `context` | `string` | **Yes** | `'GATE'` or `'EVENT'` |
| `event_id` | `string` | Optional | Required when `context === 'EVENT'` |

```json
{
  "token": "tx1.tkt_01j8n45c2m10ab.1.aB39X_kd92P0kLQz2N",
  "context": "GATE"
}
```

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "verdict": "VALID",
    "reason": null,
    "ticket": {
      "id": "tkt_01j8n45c2m10ab",
      "ticket_type": "GATE_PASS",
      "tier": "STUDENT",
      "beneficiary_name": "Priyanku Sharma",
      "requires_id_check": true,
      "institution_name": "Tezpur University",
      "institution_id": "CSB22001",
      "event": null,
      "validity": {
        "valid_from": 1793923200000,
        "valid_to": 1794182399000,
        "is_currently_valid": true
      },
      "event_checked_in_at": null
    },
    "recent_gate_entry_at": null,
    "recent_gate_entry_warning": null
  },
  "request_id": "req_01j7xyz..."
}
```

#### Verdict Types
| Verdict | Meaning | Recommended Scanner UI Color |
|---|---|---|
| `VALID` | Ticket is valid for entry. | 🟢 Green |
| `ALREADY_USED` | Ticket has already been admitted for this event. | 🔴 Red |
| `NOT_YET_VALID` | Festival or event has not started yet. | 🟡 Amber |
| `EXPIRED` | Event has ended or pass validity has lapsed. | 🔴 Red |
| `REVOKED` | Ticket was revoked by festival administrators. | 🔴 Red |
| `PAYMENT_NOT_APPROVED` | Payment is still pending manual verification. | 🟡 Amber |
| `WRONG_EVENT` | Ticket is for a different event. | 🔴 Red |
| `WRONG_TICKET_TYPE` | e.g. Trying to use an Event pass at the Main Gate. | 🔴 Red |
| `INVALID` | Ticket does not exist or payload is malformed. | 🔴 Red |

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `401` | `INVALID_QR_SIGNATURE` | Tampered, forged, or invalid HMAC signature. |
| `403` | `FORBIDDEN` | Caller is not assigned staff for this gate or event. |
| `429` | `RATE_LIMITED` | Scanner exceeded 120 scans per minute. |

---

### 1.3 Admit Attendee
Admits the attendee, records the check-in log, marks single-use check-in for events, and confirms student ID check.
- Supports optional `client_scan_id` (UUID generated on client) for idempotent network retries.

- **Method**: `POST`
- **Path**: `/api/staff/scan/admit`
- **Authentication**: Staff Session Required
- **Request Headers**:
  - `Content-Type: application/json`
  - `Cookie: __Host-session=<token>`
  - `Origin: <FRONTEND_ORIGIN>`

#### Request Body Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | **Yes** | Scanned QR token string |
| `context` | `string` | **Yes** | `'GATE'` or `'EVENT'` |
| `event_id` | `string` | Optional | Event UUID (required if `context === 'EVENT'`) |
| `student_id_checked` | `boolean` | Optional | **Mandatory `true`** if ticket is `tier === 'STUDENT'` |
| `client_scan_id` | `string` | Optional | Client-generated UUID to guard against duplicate button clicks |

```json
{
  "token": "tx1.tkt_01j8n45c2m10ab.1.aB39X_kd92P0kLQz2N",
  "context": "GATE",
  "student_id_checked": true,
  "client_scan_id": "d3b07384-d113-494b-9c87-8324f9e4210a"
}
```

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "success": true,
    "verdict": "ADMITTED",
    "ticket_id": "tkt_01j8n45c2m10ab",
    "log_id": "cil_01j8n60b1x90ab",
    "context": "GATE",
    "event_id": null,
    "student_id_checked": true,
    "admitted_at": 1729434200000,
    "idempotent_replay": false
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `400` | `BAD_REQUEST` | Student ID check required (`student_id_checked` must be `true`), or event context missing `event_id`. |
| `401` | `INVALID_QR_SIGNATURE` | HMAC signature verification failed. |
| `403` | `FORBIDDEN` | Staff member not assigned to gate or event. |
| `409` | `ALREADY_CHECKED_IN` | **TICKET ALREADY USED!** Attendee has already been checked into this event. |
| `409` | `CONFLICT` | Ticket is expired, revoked, or not currently valid. |
| `429` | `RATE_LIMITED` | Scanner rate limit exceeded. |

---

### 1.4 Deny Entry
Records a denial log when an attendee is turned away (e.g. refused student ID, expired ticket, disorderly conduct).

- **Method**: `POST`
- **Path**: `/api/staff/scan/deny`
- **Authentication**: Staff Session Required
- **Request Headers**:
  - `Content-Type: application/json`
  - `Cookie: __Host-session=<token>`
  - `Origin: <FRONTEND_ORIGIN>`

#### Request Body Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | **Yes** | Scanned QR token string |
| `context` | `string` | **Yes** | `'GATE'` or `'EVENT'` |
| `reason` | `string` | **Yes** | Non-empty reason for denial: 2 to 250 characters |
| `event_id` | `string` | Optional | Event UUID |
| `client_scan_id` | `string` | Optional | Client UUID |
| `student_id_checked` | `boolean` | Optional | Flag if ID was checked |

```json
{
  "token": "tx1.tkt_01j8n45c2m10ab.1.aB39X_kd92P0kLQz2N",
  "context": "GATE",
  "reason": "Attendee failed to produce valid college ID card",
  "student_id_checked": false
}
```

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "success": true,
    "verdict": "DENIED",
    "ticket_id": "tkt_01j8n45c2m10ab",
    "log_id": "cil_01j8n65c3y10cd",
    "context": "GATE",
    "reason": "Attendee failed to produce valid college ID card",
    "denied_at": 1729434300000,
    "idempotent_replay": false
  },
  "request_id": "req_01j7xyz..."
}
```

---

## 2. E-Sports Tournament Scoring APIs (`/api/staff/events`)

### 2.1 E-Sports Scoring Rules
- Exclusively available for events with `category === 'E_SPORTS'` and `scoring_enabled === 1`.
- **Scoring Status**: Scores can only be entered or modified when `scoring_status === 'OPEN'`.
- **Who Can Score?**:
  - Event `LEAD`: Always allowed.
  - Event `VOLUNTEER`: Allowed only when `volunteers_can_score === 1`.
  - `SUPER_ADMIN`: Always allowed.
- **Optimistic Concurrency**:
  - Initial score creation sets `version = 1`.
  - Any subsequent score update **must** include `expected_version` and a non-empty `reason`.
  - If another referee edited the score concurrently, the backend rejects with `409 SCORE_VERSION_CONFLICT`.
- **Immutable History**: Every create, update, and delete action creates an append-only row in `esports_score_history` protected by SQLite database triggers.

---

### 2.2 Get Staff Scores & Audit History
Fetches the complete staff scoring matrix (all rounds, all participants, total scores) along with the immutable history log.

- **Method**: `GET`
- **Path**: `/api/staff/events/:id/scores`
- **Authentication**: Staff Session Required (Assigned Lead/Volunteer or Super Admin)
- **Path Parameters**:
  - `id`: Event UUID.

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "evt_01j8k92b4m10ac",
      "slug": "bgmi-championship-2026",
      "title": "BGMI Mobile Championship",
      "category": "E_SPORTS",
      "scoring_enabled": 1,
      "scoring_status": "OPEN",
      "max_rounds": 6,
      "volunteers_can_score": 1,
      "leaderboard_public": 1
    },
    "scores": [
      {
        "id": "scr_01j8n80a1b10cd",
        "event_id": "evt_01j8k92b4m10ac",
        "registration_id": "reg_01j8n30a4b10ef",
        "round_no": 1,
        "score": 35.0,
        "version": 1,
        "created_by": "usr_01j8k92b4m10ac",
        "updated_by": "usr_01j8k92b4m10ac",
        "created_at": 1729434000000,
        "updated_at": 1729434000000,
        "participant_name": "Priyanku Sharma",
        "team_name": "CyberKnights"
      }
    ],
    "history": [
      {
        "id": "sch_01j8n80a2c10ef",
        "score_id": "scr_01j8n80a1b10cd",
        "event_id": "evt_01j8k92b4m10ac",
        "registration_id": "reg_01j8n30a4b10ef",
        "round_no": 1,
        "old_score": null,
        "new_score": 35.0,
        "version": 1,
        "action": "CREATE",
        "reason": "Initial round score entry",
        "actor_id": "usr_01j8k92b4m10ac",
        "actor_name": "Priyanku Sharma",
        "created_at": 1729434000000
      }
    ]
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 2.3 Create or Update Score (Upsert)
Creates a new round score or updates an existing round score with optimistic concurrency locking.

- **Method**: `PUT` (or `POST`)
- **Path**: `/api/staff/events/:eventId/scores`
- **Authentication**: Staff Session Required
- **Path Parameters**:
  - `eventId`: Event UUID.

#### Request Body Schema
| Field | Type | Required | Validation Rules |
|---|---|---|---|
| `registration_id` | `string` | **Yes** | Registration UUID for the participant/team |
| `round_no` | `integer` | **Yes** | Round number: 1 to `event.max_rounds` |
| `score` | `number` | **Yes** | Finite number between `-1,000,000` and `1,000,000` (rounded to 2 decimal places) |
| `expected_version` | `integer` | Conditional | **Required for updates** to prevent concurrent overwrites |
| `reason` | `string` | Conditional | **Required for updates** (max 500 characters) |

*Example (Initial Score Entry):*
```json
{
  "registration_id": "reg_01j8n30a4b10ef",
  "round_no": 1,
  "score": 35.0
}
```

*Example (Score Correction / Update):*
```json
{
  "registration_id": "reg_01j8n30a4b10ef",
  "round_no": 1,
  "score": 40.0,
  "expected_version": 1,
  "reason": "Added 5 kill points verified from referee replay"
}
```

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "scr_01j8n80a1b10cd",
    "event_id": "evt_01j8k92b4m10ac",
    "registration_id": "reg_01j8n30a4b10ef",
    "round_no": 1,
    "score": 40.0,
    "version": 2,
    "created_by": "usr_01j8k92b4m10ac",
    "updated_by": "usr_01j8k92b4m10ac",
    "created_at": 1729434000000,
    "updated_at": 1729434500000
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `400` | `INVALID_CATEGORY` | Event is not `E_SPORTS`. |
| `400` | `SCORING_DISABLED` | Scoring is not enabled for this event. |
| `400` | `INVALID_ROUND` | `round_no` is outside valid bounds (1 to `max_rounds`). |
| `400` | `REASON_REQUIRED` | A reason is required when updating an existing score. |
| `403` | `FORBIDDEN` | Caller is not assigned to score this event, or volunteers are disallowed. |
| `409` | `SCORING_NOT_OPEN` | Scoring is `FINALIZED` and cannot be modified. |
| `409` | `SCORE_VERSION_CONFLICT` | The score was modified by another referee concurrently. Re-fetch scores and try again. |

---

### 2.4 Delete Score Entry
Deletes a score entry. Requires event `LEAD` or `SUPER_ADMIN` and a non-empty reason.
- Appends an immutable `DELETE` history entry to the audit log.

- **Method**: `DELETE`
- **Path**: `/api/staff/events/:id/scores/:entryId`
- **Authentication**: Lead / Super Admin Session Required
- **Path Parameters**:
  - `id`: Event UUID.
  - `entryId`: Score entry UUID (`scr_...`).

#### Request Body Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `reason` | `string` | **Yes** | Reason for deletion (2 to 500 characters) |

```json
{
  "reason": "Score entered for wrong team by mistake"
}
```

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "score_id": "scr_01j8n80a1b10cd"
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Reason is missing or too short. |
| `403` | `FORBIDDEN` | Volunteers cannot delete scores (Lead or Super Admin only). |
| `409` | `SCORING_NOT_OPEN` | Scoring is already `FINALIZED`. |

---

### 2.5 Finalize Event Scoring
Transitions `scoring_status` from `OPEN` to `FINALIZED`. Locks all scores against further edits.
- Can only be undone by a Super Administrator via the Reopen endpoint.

- **Method**: `POST`
- **Path**: `/api/staff/events/:id/scores/finalize`
- **Authentication**: Lead / Super Admin Session Required
- **Path Parameters**:
  - `id`: Event UUID.

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "evt_01j8k92b4m10ac",
    "title": "BGMI Mobile Championship",
    "scoring_status": "FINALIZED",
    "updated_at": 1729434800000
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `403` | `FORBIDDEN` | Caller is not Lead or Super Admin. |
| `409` | `CONFLICT` | Scoring is not in `OPEN` status. |
