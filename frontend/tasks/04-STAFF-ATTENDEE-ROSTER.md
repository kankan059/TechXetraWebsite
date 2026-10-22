# Task 04: Attendee & Team Roster Console

This task specifies the implementation of the Attendee & Team Roster page (`/staff/events/[id]/registrations`), which allows event leads and volunteers to inspect registered participants, verify their check-in status, search records, and review custom form questionnaire answers.

---

## 1. Overview & Purpose
During festival operations, event organizers need to:
* Look up registered participants and teams quickly at the venue.
* Check whether an attendee has already been admitted or has a confirmed ticket.
* View answers to dynamic event questionnaires (e.g. GitHub links, team roles, dietary requirements).
* Export attendee lists for offline jury scoring or record-keeping.

---

## 2. Backend Endpoint Contract

### Route: `GET /api/staff/events/:id/registrations`
* **Query Parameters**: `?search=<string>` (searches participant name, email, or team name).
* **Auth**: Assigned Staff (`VOLUNTEER` min) or `SUPER_ADMIN`.
* **Response Model**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "registration_id": "reg_01j7xyz",
      "status": "CONFIRMED",
      "seat_count": 1,
      "registered_at": 1793800000000,
      "participant": {
        "id": "TX260042",
        "name": "Alex Sharma",
        "email": "alex@tezpur.ac.in",
        "phone": "9876543210",
        "institution_name": "Tezpur University",
        "institution_id": "CSB22045"
      },
      "team": {
        "id": "team_alpha",
        "name": "Team CyberHacks"
      },
      "ticket": {
        "id": "tkt_998877",
        "status": "ACTIVE",
        "checked_in": true,
        "checked_in_at": 1794012000000
      },
      "form_responses": {
        "github_url": "https://github.com/alexsharma/project",
        "tshirt_size": "L",
        "experience_level": "Advanced"
      }
    }
  ]
}
```

---

## 3. Page Implementation: `frontend/app/staff/events/[id]/registrations/page.tsx`

### UI Structure:

#### 1. Header & Controls:
* **Breadcrumb**: `Staff Portal / Events / [Event Title] / Registrations`
* **Real-time Search Bar**:
  * Input with search icon and clear button.
  * Debounced by 300ms to trigger `staffApi.events.getRegistrations(eventId, searchTerm)`.
  * Searches across participant names, emails, and team names.
* **Filter Badges**:
  * Status: `All`, `Confirmed`, `Reserved`.
  * Admission: `All`, `Checked In`, `Not Checked In`.
* **Export Action**:
  * *"Export to CSV"* button generating a local `.csv` file containing participant contact info, team, check-in time, and custom questionnaire columns.

#### 2. Attendee Table:
Columns:
1. **Participant**:
   * Name in bold.
   * Student ID / Roll number + Institution badge (e.g. *"Tezpur University (CSB22045)"*).
2. **Contact**:
   * Email and clickable `tel:` phone link.
3. **Team**:
   * Team name with group icon, or *"Solo Participant"* in muted text.
4. **Registration Status**:
   * `CONFIRMED` (green) or `RESERVED` (amber).
5. **Venue Check-In**:
   * If `ticket?.checked_in === true`: Green badge *"Admitted (10:14 AM)"*.
   * If `ticket?.checked_in === false`: Slate badge *"Pending Entrance"*.
   * If no ticket: Muted badge *"Awaiting Payment"*.
6. **Form Answers**:
   * If `form_responses` exists and has keys:
     * A clickable pill: *"View Answers (3)"* opening the Questionnaire Answers Popover/Modal.
   * If no responses: Muted *"None"*.

---

## 4. Component: `<QuestionnaireResponsesModal />`
Create at: `frontend/components/staff/QuestionnaireResponsesModal.tsx`

When a staff member clicks *"View Answers"*, a slide-over drawer or modal displays:
* Participant Name & Team.
* List of all key-value answers:
  ```tsx
  <div className="space-y-4">
    {Object.entries(responses).map(([key, value]) => (
      <div key={key} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
          {key.replace(/_/g, " ")}
        </p>
        <div className="mt-1 text-sm text-white">
          {String(value).startsWith("http") ? (
            <a
              href={String(value)}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 underline hover:text-cyan-300 break-all"
            >
              {String(value)}
            </a>
          ) : (
            <span className="whitespace-pre-wrap">{String(value)}</span>
          )}
        </div>
      </div>
    ))}
  </div>
  ```

---

## 5. CSV Export Helper Function
Create at: `frontend/lib/export-csv.ts`

```ts
export function exportRegistrationsToCsv(
  eventTitle: string,
  registrations: EventRegistrationDetail[]
) {
  // Collect all unique form response keys across all participants
  const formKeys = Array.from(
    new Set(
      registrations.flatMap((r) =>
        r.form_responses ? Object.keys(r.form_responses) : []
      )
    )
  );

  const headers = [
    "Registration ID",
    "Status",
    "Participant Name",
    "Email",
    "Phone",
    "Institution",
    "Roll Number",
    "Team Name",
    "Checked In",
    "Checked In At",
    ...formKeys.map((k) => `Form: ${k}`),
  ];

  const rows = registrations.map((r) => [
    r.registration_id,
    r.status,
    `"${r.participant.name}"`,
    r.participant.email,
    r.participant.phone || "",
    `"${r.participant.institution_name || ""}"`,
    r.participant.institution_id || "",
    `"${r.team?.name || "Solo"}"`,
    r.ticket?.checked_in ? "YES" : "NO",
    r.ticket?.checked_in_at ? new Date(r.ticket.checked_in_at).toLocaleString() : "",
    ...formKeys.map((k) => `"${r.form_responses?.[k] ?? ""}"`),
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${eventTitle.replace(/\s+/g, "_")}_Roster.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```
