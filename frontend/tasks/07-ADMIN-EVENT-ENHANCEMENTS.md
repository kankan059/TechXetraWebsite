# Task 07: Super Admin Event Controls & Safe Deletion

This task specifies the administrative enhancements required for [`frontend/app/admin/compititions/page.tsx`](file:///home/ppriyankuu/Projects/TechXetraWebsite/frontend/app/admin/compititions/page.tsx) and related admin components.

---

## 1. Overview & Problem Context
The current Admin Competitions page ([`frontend/app/admin/compititions/page.tsx`](file:///home/ppriyankuu/Projects/TechXetraWebsite/frontend/app/admin/compititions/page.tsx)):
1. Calls `/api/events/:id` for editing (which is restricted and does not allow modifying capacity, prices, or form schema).
2. Has **no delete button or deletion workflow**, even though the backend provides `DELETE /api/admin/events/:id`.
3. Does not allow defining or previewing dynamic registration forms (`form_schema`).

---

## 2. Backend Endpoint Contracts

### 2.1 Safe Event Deletion
* **Route**: `DELETE /api/admin/events/:id`
* **Auth**: `requireSuperAdminOnly()`
* **Logic & Invariant**:
  * If the event has active registrations (`RESERVED`, `CONFIRMED`) or issued tickets: It **does not** hard delete. It gracefully transitions `status = 'CANCELLED'` and records an `EVENT_CANCELLED` audit log.
  * If 0 registrations and tickets: It hard-deletes the event and its `event_staff` assignments, and records an `EVENT_DELETED` audit log.
* **Response Model**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "deleted": false,
      "status": "CANCELLED",
      "message": "Event has active registrations/tickets; status was transitioned to CANCELLED to preserve attendee records."
    }
  }
  ```

### 2.2 Super Admin Full Event Update
* **Route**: `PATCH /api/admin/events/:id`
* **Auth**: `requireSuperAdminOnly()`
* **Payload**:
  ```json
  {
    "title": "Robotics Sumo Wrestling",
    "category": "TECHNICAL",
    "description": "Construct autonomous or remote-controlled robots...",
    "venue": "Indoor Stadium",
    "day_of_event": 3,
    "starts_at": 1794100000000,
    "ends_at": 1794180000000,
    "registration_closes_at": 1794090000000,
    "status": "OPEN",
    "is_team_event": true,
    "min_team_size": 2,
    "max_team_size": 4,
    "price_model": "PER_TEAM",
    "price_paise": 50000,
    "student_price_paise": 40000,
    "capacity": 30,
    "capacity_unit": "TEAMS",
    "scoring_enabled": false,
    "form_schema": "[{\"id\":\"bot_weight\",\"label\":\"Robot Weight (kg)\",\"type\":\"number\",\"required\":true}]"
  }
  ```
* **Response Model**: `200 OK` (Returns updated `PublicEventResponse`).

### 2.3 Event Staff Roster API
* **List Staff**: `GET /api/admin/events/:id/staff`
* **Assign Staff**: `POST /api/admin/events/:id/staff` (`{ user_id: string, role: "LEAD" | "VOLUNTEER" }`)
* **Remove Staff**: `DELETE /api/admin/events/:id/staff/:userId`

---

## 3. UI Modifications in `frontend/app/admin/compititions/page.tsx`

### 3.1 Adding Safe Delete Action
1. In the events table, add a **Delete** button (trash icon in red) next to the Edit and Assign Staff buttons.
2. Clicking Delete opens a `<ConfirmDeleteEventModal />`:
   * Displays the event title.
   * Explanatory Alert:
     > *"Notice: If attendees have already registered or purchased tickets for this event, the event will NOT be erased. It will be gracefully cancelled to preserve participant tickets and financial history."*
   * Confirmation Button: *"Delete or Cancel Event"*.
3. On completion, displays a banner with the backend message:
   * E.g., *"Event has active registrations; status was transitioned to CANCELLED."* or *"Event successfully deleted."*
   * Triggers `loadEvents()` to refresh the directory.

---

### 3.2 Upgrading the Edit Modal to Full Super Admin Update
Replace the limited edit modal with a comprehensive multi-tab editor:
* **Tab 1 — Basic Info & Timings**: Title, slug, category, day of event (1, 2, or 3), start time, end time, venue, description, and status (`DRAFT`, `OPEN`, `CLOSED`, `COMPLETED`, `CANCELLED`).
* **Tab 2 — Team Sizing & Pricing**:
  * Team event toggle (`is_team_event`).
  * Min & Max team sizes (if team event).
  * Price Model (`FREE`, `PER_PARTICIPANT`, `PER_TEAM`).
  * General price in paise/rupees.
  * Student discount price in paise/rupees.
  * Capacity limit and capacity unit (`SEATS` vs `TEAMS`).
* **Tab 3 — E-Sports Scoring (if category === 'E_SPORTS')**:
  * Scoring enabled toggle.
  * Max rounds.
  * Volunteer scoring permission toggle.
  * Public leaderboard visibility toggle.
* **Tab 4 — Dynamic Registration Form**:
  * Embedded `<FormSchemaBuilder />` component or raw JSON schema editor allowing the Super Admin to configure questions.

---

### 3.3 Enhanced Staff Assignment Management
In the Assign Staff modal:
* Display the list of currently assigned staff for the selected event (`GET /api/admin/events/:id/staff`).
* Allow removing assigned staff with a red "Remove" button calling `DELETE /api/admin/events/:id/staff/:userId`.
* Searchable user dropdown to assign new Leads or Volunteers.
