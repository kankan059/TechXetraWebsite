# Task 03: Staff Events Hub & Live Event Dashboard

This task specifies the UI layout, component hierarchy, state management, and API integration for the Event Committee Hub and the Event Analytics Dashboard.

---

## 1. Overview & User Story
* **As an Event Lead or Volunteer**, I want to log into `/staff` and see all the events I have been assigned to coordinate.
* **When I select an event**, I want to see a live dashboard displaying total capacity, confirmed attendees, reserved orders awaiting payment, how many people have physically checked in at the door, and the contact roster of other assigned committee members.
* **If I am a Super Admin**, I should be able to view and manage *all* events in the fest.

---

## 2. Page 1: Staff Portal Hub Update (`frontend/app/staff/page.tsx`)

### Changes Needed:
In [`frontend/app/staff/page.tsx`](file:///home/ppriyankuu/Projects/TechXetraWebsite/frontend/app/staff/page.tsx), add a prominent third operational card: **"Event Committee Hub"** alongside the existing QR Scanner and E-Sports Scoring cards:

```tsx
{/* Event Committee Management Card */}
<div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-7 shadow-xl">
  <div>
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-400/10 text-purple-300">
      <CalendarDays className="h-6 w-6" />
    </div>
    <h2 className="mt-4 text-xl font-bold text-white">Event Committee Console</h2>
    <p className="mt-2 text-xs leading-relaxed text-white/60">
      Manage your assigned competitions and activities. View live registrations, check-in stats, participant rosters, and verify attendee UPI payments.
    </p>
  </div>

  <div className="mt-8 border-t border-white/10 pt-5">
    <Link
      href="/staff/events"
      className="inline-flex w-full items-center justify-between rounded-xl bg-purple-400 px-5 py-3 text-xs font-bold text-black transition hover:bg-purple-300"
    >
      <span>Open Committee Events Hub</span>
      <ArrowRight className="h-4 w-4" />
    </Link>
  </div>
</div>
```

---

## 3. Page 2: My Assigned Events Directory (`frontend/app/staff/events/page.tsx`)

Create a new page at: `frontend/app/staff/events/page.tsx`

### Backend Endpoint Contract:
* **Route**: `GET /api/staff/events/mine`
* **Auth**: `requireAuth()` (Caller must be `VOLUNTEER`, `LEAD`, or `SUPER_ADMIN`).
* **Response Model**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "evt_hackathon_01",
        "slug": "ai-hackathon",
        "title": "AI & Robotics Hackathon",
        "category": "TECHNICAL",
        "role": "LEAD",
        "day_of_event": 2,
        "venue": "Computer Lab 3",
        "status": "OPEN",
        "capacity": 100,
        "seats_taken": 42,
        "seats_remaining": 58,
        "confirmed_registrations_count": 35,
        "reserved_registrations_count": 7,
        "pending_payments_count": 4
      }
    ]
  }
  ```

### UI Specifications:
1. **Header**:
   * Title: *"My Assigned Fest Events"*
   * Subtitle: Shows user's name and global role badge.
   * Quick filter tabs: `All`, `Day 1`, `Day 2`, `Day 3`.
2. **Event Card Grid**:
   * **Role Tag**: Glowing badge indicating `LEAD` (purple) or `VOLUNTEER` (cyan).
   * **Event Title & Category**: Category badge (e.g. `TECHNICAL`, `CULTURAL`).
   * **Venue & Day**: e.g., *"Day 2 • Computer Lab 3"*.
   * **Live Stats Badges**:
     * `Confirmed`: Green badge with `confirmed_registrations_count`.
     * `Seats Left`: Amber badge with `seats_remaining`.
     * `Pending Review`: Red alert badge with `pending_payments_count` (alerts Lead if action needed).
   * **Action Link**: *"Open Event Dashboard →"* navigating to `/staff/events/[id]`.
3. **Empty State**:
   * If `data.length === 0`: Friendly graphic indicating *"You have not been assigned to any events yet. Contact festival administrator."*

---

## 4. Page 3: Live Event Dashboard (`frontend/app/staff/events/[id]/page.tsx`)

Create the event command center page at: `frontend/app/staff/events/[id]/page.tsx`

### Backend Endpoint Contract:
* **Route**: `GET /api/staff/events/:id/dashboard`
* **Auth**: Staff assigned to event (`VOLUNTEER` min) or `SUPER_ADMIN`.
* **Response Model**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "event": {
        "id": "evt_hackathon_01",
        "title": "AI & Robotics Hackathon",
        "category": "TECHNICAL",
        "status": "OPEN",
        "venue": "Computer Lab 3",
        "day_of_event": 2,
        "starts_at": 1794009600000,
        "ends_at": 1794095999999,
        "registration_closes_at": 1794006000000,
        "capacity": 100,
        "seats_taken": 42
      },
      "metrics": {
        "confirmed_count": 35,
        "reserved_count": 7,
        "checked_in_count": 28,
        "pending_payments_count": 4,
        "seats_remaining": 58
      },
      "staff": [
        {
          "role": "LEAD",
          "assigned_at": 1793500000000,
          "user_id": "TX260010",
          "name": "Jane Lead",
          "email": "lead@techxetra.in",
          "phone": "9876543210"
        },
        {
          "role": "VOLUNTEER",
          "assigned_at": 1793550000000,
          "user_id": "TX260025",
          "name": "John Volunteer",
          "email": "vol@techxetra.in",
          "phone": "9876543211"
        }
      ]
    }
  }
  ```

### UI Layout & Components:

#### 1. Header Bar:
* Breadcrumb: `Staff Portal / Events / [Event Title]`
* Title with Status Badge (`OPEN`, `CLOSED`, `COMPLETED`, `CANCELLED`).
* Date, Time, and Venue details.

#### 2. Sub-Navigation Tabs:
Persistent navigation bar across the event suite:
* **Dashboard / Overview** (`/staff/events/[id]`)
* **Attendee Roster** (`/staff/events/[id]/registrations`)
* **Payment Review Queue** (`/staff/events/[id]/payments`) — *Only visible/accessible if user is `LEAD` or `SUPER_ADMIN`*.
* **Event Settings** (`/staff/events/[id]/settings`) — *Only visible/accessible if user is `LEAD` or `SUPER_ADMIN`*.
* **QR Scanner** (`/staff/scan?event_id=[id]`) — Pre-fills the event context.

#### 3. Metrics Grid (4 Stat Cards):
1. **Confirmed Registrations**: `metrics.confirmed_count` (with percentage of capacity).
2. **Seats Remaining**: `metrics.seats_remaining` / `event.capacity` (with visual progress bar).
3. **Checked-In at Arena**: `metrics.checked_in_count` (live door check-in progress).
4. **Pending Payment Reviews**: `metrics.pending_payments_count` (clickable link jumping to `/payments`).

#### 4. Committee Staff Roster:
* Table displaying all Leads and Volunteers assigned to this event.
* Columns: Name, Role Badge, Email, Phone, Assigned Date.
* Quick "Call" / "Email" action shortcuts for on-site coordination.
