# Task 06: Event Lead Settings & Form Schema Builder

This task specifies the Event Settings console at `/staff/events/[id]/settings`. It enables assigned Event Leads and Super Admins to configure operational event details (venue, description, rules, deadlines) and visually build or edit dynamic registration questionnaires (`form_schema`).

---

## 1. Access Control & Scoped Permissions

> [!IMPORTANT]
> **Lead Permission Scope**: Event Leads can only edit operational fields: `venue`, `description`, `metadata`, `form_schema`, and `registration_closes_at`.
> If a Lead attempts to modify ticket pricing, seat capacity, or fest dates, the backend rejects the request with `403 FORBIDDEN`.
> Volunteers are completely blocked from this page.

---

## 2. Backend Endpoint Contract

### Route: `PATCH /api/staff/events/:id`
* **Auth**: Assigned `LEAD` or `SUPER_ADMIN`
* **Request Payload**:
  ```json
  {
    "venue": "Academic Complex Lab 2",
    "description": "Updated event rules and problem statement...",
    "metadata": "{\"rules\": [\"Bring your own laptop\", \"Team of 2-4\"]}",
    "registration_closes_at": 1794006000000,
    "form_schema": "[{\"id\":\"github_url\",\"label\":\"GitHub Repo\",\"type\":\"url\",\"required\":true}]"
  }
  ```
* **Response Model**: `200 OK` (Returns updated `PublicEventResponse`).

---

## 3. Page Implementation: `frontend/app/staff/events/[id]/settings/page.tsx`

### Sections on the Settings Page:

#### 1. General Operational Details:
* **Venue Input**:
  * Text field (e.g. *"Seminar Hall 2"* or *"Football Ground"*).
* **Event Description**:
  * Markdown-capable textarea describing the competition, theme, and schedule.
* **Registration Deadline Picker**:
  * Date & Time picker for `registration_closes_at`. Must be before or equal to the event's `ends_at`.
* **Rules & Guidelines (`metadata`)**:
  * Key-value or list input for rules, judging criteria, and discord server links.

#### 2. Visual Dynamic Questionnaire Builder:
An interactive form builder component allowing Leads to configure custom questions asked to participants during checkout.

---

## 4. Component: `<FormSchemaBuilder />`
Create at: `frontend/components/staff/FormSchemaBuilder.tsx`

### Features:
1. **Questions List**:
   * Displays all currently configured questions in an accordion or card list.
   * Drag-and-drop or Up/Down buttons to reorder questions.
2. **"Add New Question" Button**:
   * Creates a new question definition card.
3. **Question Card Fields**:
   * **Question Label**: e.g., *"GitHub Profile or Portfolio Link"*.
   * **Field ID**: Auto-slugified from label or editable (e.g. `github_url`).
   * **Input Type Dropdown**:
     * `text` (Single line text)
     * `textarea` (Multi-line text / pitch)
     * `number` (Numeric answer)
     * `email` (Email address)
     * `url` (Web link)
     * `select` (Dropdown menu)
   * **Required Toggle**: Switch indicating whether the participant *must* answer this question to check out.
   * **Placeholder**: Optional example text (e.g. *"https://github.com/username"*).
   * **Options Builder** *(Only visible when Type is `select`)*:
     * Add option entries (e.g., *"Small"*, *"Medium"*, *"Large"*, *"XL"*).
   * **Delete Question Button**: Removes the card.
4. **Live Preview Mode**:
   * Side-by-side or tab preview rendering `<FormFieldRenderer />` to simulate exactly what the participant will see during checkout.

### Form Schema Serialization:
When the Lead saves the form, serialize the state array to a JSON string:
```ts
const jsonSchemaString = JSON.stringify(questionsList);
await staffApi.events.update(eventId, {
  venue,
  description,
  metadata,
  registration_closes_at: registrationDeadlineMs,
  form_schema: jsonSchemaString,
});
```
