# Module 02: Catalog, Events & Public Leaderboards

This document covers festival-wide catalog information, public event discovery, event details, lead/admin event updates, and public e-sports leaderboard scoreboards.

---

## 1. Overview & Data Concepts

### 1.1 Gate Passes vs. Event Passes
- **Gate Pass**: The festival entry ticket. Valid across all 3 festival days. Gives access to the campus grounds, general exhibition zones, and cultural pro-nites.
- **Event Pass**: Required for specific events (e.g. robotics competitions, coding hackathons, e-sports tournaments). An event can be solo or team-based, free or paid.

### 1.2 Event Pricing Models
- `'FREE'`: No payment needed (`price_paise === 0`). Purchase creates tickets and registration immediately.
- `'PER_PARTICIPANT'`: Price applies per individual. For team events, total price is `unit_price * team_size`.
- `'PER_TEAM'`: Fixed price for the entire team regardless of how many members are in the team.

### 1.3 Event Capacity Units
- `'SEATS'`: Individual capacity (number of individual participants).
- `'TEAMS'`: Team capacity (number of teams).

---

## 2. Festival Catalog Endpoints

### 2.1 Get Festival Passes & Configuration
Returns the festival gate pass pricing, festival day dates/schedules, purchasing status, and support contacts. Use this to render the festival landing page hero and ticket purchase options.

- **Method**: `GET`
- **Path**: `/api/catalog/passes`
- **Authentication**: None (Public)
- **Request Headers**: None required

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "gate_pass": {
      "price_paise": 30000,
      "student_price_paise": 20000,
      "validity": "Valid across all fest days (Day 1 through Day 3)"
    },
    "fest_days": [
      {
        "day_number": 1,
        "date": "2026-11-06",
        "starts_at": 1793923200000,
        "ends_at": 1794009599000,
        "description": "Inauguration, Hackathons & Cultural Night"
      },
      {
        "day_number": 2,
        "date": "2026-11-07",
        "starts_at": 1794009600000,
        "ends_at": 1794095999000,
        "description": "Tech Exhibitions, Robot Wars & DJ Night"
      },
      {
        "day_number": 3,
        "date": "2026-11-08",
        "starts_at": 1794096000000,
        "ends_at": 1794182399000,
        "description": "Grand E-Sports Finals & Celebrity Concert"
      }
    ],
    "purchases_enabled": true,
    "student_id_warning_text": "Physical student institution ID card must be presented at entry for verification.",
    "support_contact": "support@techxetra.in"
  },
  "request_id": "req_01j7xyz..."
}
```

> **UI Tip**: If `purchases_enabled === false`, disable checkout buttons and display a banner: *"Ticket sales are currently paused by festival administration."*

---

## 3. Events Directory Endpoints

### 3.1 List Events (Search, Filter & Pagination)
Fetches public events with filtering by category, day, team vs solo, and search query. Uses cursor-based pagination. Non-staff callers will only see events with status other than `DRAFT`.

- **Method**: `GET`
- **Path**: `/api/events`
- **Authentication**: Optional (`optionalAuth`). If logged in as staff/super admin, draft events may be accessible.

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `category` | `string` | No | Category enum: `CULTURAL`, `TECHNICAL`, `E_SPORTS`, `SPORTS`, `MANAGEMENT`, `LITERARY`, `WORKSHOP`, `INTERACTIVE`, `RECREATIONAL`, `SHOWCASE`, `OTHER` | `category=TECHNICAL` |
| `day` | `integer` | No | Fest day number (`1`, `2`, or `3`) | `day=2` |
| `is_team` | `string \| boolean` | No | Filter by solo vs team (`true`, `false`, `1`, `0`) | `is_team=true` |
| `search` | `string` | No | Free-text search term matching title or description (max 100 chars) | `search=robotics` |
| `cursor` | `string` | No | Opaque base64 cursor from previous page (`next_cursor`) | `cursor=eyJzb3J0VmFsdWUiOjE3...` |
| `limit` | `integer` | No | Number of events per page (1 to 50, default: `20`) | `limit=10` |

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "evt_01j8k92b4m10ac",
        "slug": "robo-wars-heavyweight",
        "title": "Robo Wars: Heavyweight Arena",
        "category": "TECHNICAL",
        "description": "Combat robotics showdown in an enclosed steel arena.",
        "venue": "Outdoor Arena 1",
        "day_of_event": 2,
        "starts_at": 1794016800000,
        "ends_at": 1794031200000,
        "registration_closes_at": 1793995200000,
        "status": "OPEN",
        "is_team_event": true,
        "min_team_size": 2,
        "max_team_size": 5,
        "price_model": "PER_TEAM",
        "price_paise": 50000,
        "student_price_paise": 35000,
        "capacity": 32,
        "seats_taken": 14,
        "seats_remaining": 18,
        "capacity_unit": "TEAMS",
        "registration_open": true,
        "scoring_enabled": false,
        "leaderboard_public": false,
        "metadata": "{\"rules_url\":\"https://techxetra.in/rules/robowars.pdf\"}"
      }
    ],
    "next_cursor": "eyJzb3J0VmFsdWUiOjE3OTQwMTY4MDAwMDAsImlkIjoiZXZ0XzAxajhrOTJiNG0xMGFjIn0"
  },
  "request_id": "req_01j7xyz..."
}
```

---

### 3.2 Get Single Event Details
Fetches full details for a single event using either its unique ID (`evt_...`) or unique URL slug (`robo-wars-heavyweight`).

- **Method**: `GET`
- **Path**: `/api/events/:idOrSlug`
- **Authentication**: Optional (`optionalAuth`).
- **Path Parameters**:
  - `idOrSlug`: Event UUID (e.g. `evt_01j8...`) or slug string (e.g. `bgmi-championship-2026`).

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "evt_01j8k92b4m10ac",
    "slug": "robo-wars-heavyweight",
    "title": "Robo Wars: Heavyweight Arena",
    "category": "TECHNICAL",
    "description": "Combat robotics showdown in an enclosed steel arena. Full rules apply.",
    "venue": "Outdoor Arena 1",
    "day_of_event": 2,
    "starts_at": 1794016800000,
    "ends_at": 1794031200000,
    "registration_closes_at": 1793995200000,
    "status": "OPEN",
    "is_team_event": true,
    "min_team_size": 2,
    "max_team_size": 5,
    "price_model": "PER_TEAM",
    "price_paise": 50000,
    "student_price_paise": 35000,
    "capacity": 32,
    "seats_taken": 14,
    "seats_remaining": 18,
    "capacity_unit": "TEAMS",
    "registration_open": true,
    "scoring_enabled": false,
    "leaderboard_public": false,
    "metadata": "{\"rules_url\":\"https://techxetra.in/rules/robowars.pdf\"}"
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `404` | `NOT_FOUND` | Event does not exist, or event is in `DRAFT` status and caller is not authorized event staff. |

---

### 3.3 Update Event (Staff Lead / Admin)
Allows authorized event staff or super administrators to edit event information.
- **Lead Permissions**: Assigned `LEAD` staff can only modify `description` and `venue`.
- **Super Admin Permissions**: Can modify any field (capacity, dates, prices, team sizes, scoring status, etc.).

- **Method**: `PATCH`
- **Path**: `/api/events/:id`
- **Authentication**: Session Required (must be assigned `LEAD` for this event or `SUPER_ADMIN`)
- **Request Headers**:
  - `Content-Type: application/json`
  - `Cookie: __Host-session=<token>`
  - `Origin: <FRONTEND_ORIGIN>`

#### Request Body Schema
All fields are optional. Unknown fields are rejected (`.strict()`).
| Field | Type | Validation / Constraints |
|---|---|---|
| `title` | `string` | 3 to 100 characters |
| `category` | `string` | Valid EventCategory enum |
| `description` | `string \| null` | Max 2000 characters |
| `venue` | `string \| null` | Max 200 characters |
| `day_of_event` | `integer` | 1, 2, or 3 |
| `starts_at` | `integer` | Unix ms |
| `ends_at` | `integer` | Unix ms (must be after `starts_at`) |
| `registration_closes_at` | `integer \| null` | Unix ms |
| `status` | `string` | `'DRAFT'`, `'OPEN'`, `'CLOSED'`, `'COMPLETED'`, `'CANCELLED'` |
| `is_team_event` | `boolean` | `true` or `false` |
| `min_team_size` | `integer` | 1 to 50 |
| `max_team_size` | `integer` | 1 to 50 (must be $\ge$ `min_team_size`) |
| `price_model` | `string` | `'FREE'`, `'PER_PARTICIPANT'`, `'PER_TEAM'` |
| `price_paise` | `integer` | Non-negative integer |
| `student_price_paise` | `integer \| null` | Non-negative integer or null |
| `capacity` | `integer \| null` | $\ge 1$ or null (unlimited). Cannot be reduced below current `seats_taken`. |
| `capacity_unit` | `string` | `'SEATS'` or `'TEAMS'` |
| `scoring_enabled` | `boolean` | Supported only for `category === 'E_SPORTS'` |
| `scoring_status` | `string` | `'NOT_APPLICABLE'`, `'OPEN'`, `'FINALIZED'` |
| `max_rounds` | `integer` | 1 to 20 |
| `volunteers_can_score` | `boolean` | Whether assigned volunteers may enter scores |
| `leaderboard_public` | `boolean` | Whether public leaderboard endpoint is accessible |
| `metadata` | `string \| null` | JSON string or text metadata |

```json
{
  "venue": "Indoor Sports Complex — Court 2",
  "description": "Updated match schedule: preliminaries begin at 10:00 AM."
}
```

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "evt_01j8k92b4m10ac",
    "slug": "robo-wars-heavyweight",
    "title": "Robo Wars: Heavyweight Arena",
    "category": "TECHNICAL",
    "description": "Updated match schedule: preliminaries begin at 10:00 AM.",
    "venue": "Indoor Sports Complex — Court 2",
    "day_of_event": 2,
    "starts_at": 1794016800000,
    "ends_at": 1794031200000,
    "registration_closes_at": 1793995200000,
    "status": "OPEN",
    "is_team_event": true,
    "min_team_size": 2,
    "max_team_size": 5,
    "price_model": "PER_TEAM",
    "price_paise": 50000,
    "student_price_paise": 35000,
    "capacity": 32,
    "seats_taken": 14,
    "seats_remaining": 18,
    "capacity_unit": "TEAMS",
    "registration_open": true,
    "scoring_enabled": false,
    "leaderboard_public": false,
    "metadata": null
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Date ranges invalid, price negative, or field out of range. |
| `403` | `FORBIDDEN` | Caller is not assigned `LEAD` for this event or not `SUPER_ADMIN`. Also thrown if a `LEAD` tries to modify restricted fields (like capacity or price). |
| `404` | `NOT_FOUND` | Event does not exist. |
| `409` | `CAPACITY_BELOW_TAKEN` | Attempted to reduce event capacity below the seats already confirmed/reserved. |

---

## 4. Leaderboards Endpoints

### 4.1 List Public Leaderboards
Lists all active e-sports events that have public leaderboards enabled. Caches responses on Cloudflare edge for 10 seconds (`Cache-Control: public, max-age=10`).

- **Method**: `GET`
- **Path**: `/api/leaderboards`
- **Authentication**: None (Public)
- **Response Cache Header**: `Cache-Control: public, max-age=10`

#### Success Response
- **Status**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "evt_01j8k92b4m10ac",
      "slug": "bgmi-championship-2026",
      "title": "BGMI Mobile Championship",
      "category": "E_SPORTS",
      "scoring_status": "OPEN",
      "max_rounds": 6,
      "leaderboard_public": true
    }
  ],
  "request_id": "req_01j7xyz..."
}
```

---

### 4.2 Get Event Public Leaderboard
Returns the real-time calculated leaderboard for an e-sports event.
- Automatically handles ties using standard tournament ranking (`RANK()`).
- Excludes unconfirmed/cancelled registrations.
- Never reveals sensitive participant data (no phone numbers, emails, or student IDs).
- When `leaderboard_public === true`, edge caches for 10 seconds.
- Assigned staff can view the leaderboard even if `leaderboard_public === false`.

- **Method**: `GET`
- **Path**: `/api/events/:id/leaderboard`
- **Authentication**: Optional (`optionalAuth`).
- **Path Parameters**:
  - `id`: Event UUID.

#### Success Response
- **Status**: `200 OK`
- **Header**: `Cache-Control: public, max-age=10` (when public)
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "evt_01j8k92b4m10ac",
      "title": "BGMI Mobile Championship",
      "slug": "bgmi-championship-2026",
      "category": "E_SPORTS",
      "max_rounds": 6,
      "scoring_status": "OPEN",
      "leaderboard_public": true
    },
    "leaderboard": [
      {
        "rank": 1,
        "registration_id": "reg_01j8a2bc9001",
        "display_name": "Team Soul",
        "team_name": "Team Soul",
        "participant_name": "Naman Mathur",
        "total_score": 145.5,
        "round_scores": {
          "1": 25.0,
          "2": 30.5,
          "3": 40.0,
          "4": 50.0
        }
      },
      {
        "rank": 2,
        "registration_id": "reg_01j8a2bc9002",
        "display_name": "GodLike Esports",
        "team_name": "GodLike Esports",
        "participant_name": "Jonathan Amaral",
        "total_score": 138.0,
        "round_scores": {
          "1": 35.0,
          "2": 20.0,
          "3": 45.0,
          "4": 38.0
        }
      }
    ]
  },
  "request_id": "req_01j7xyz..."
}
```

#### Possible Errors
| HTTP Status | Error Code | Description / Reason |
|---|---|---|
| `400` | `INVALID_CATEGORY` | Event category is not `E_SPORTS`. |
| `400` | `SCORING_DISABLED` | Scoring is not enabled for this event. |
| `403` | `FORBIDDEN` | Leaderboard is private (`leaderboard_public === false`) and caller is not assigned staff. |
| `404` | `NOT_FOUND` | Event does not exist. |
