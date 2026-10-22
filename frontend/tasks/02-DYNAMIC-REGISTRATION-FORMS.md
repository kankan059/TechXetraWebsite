# Task 02: Dynamic Registration Questionnaires & Checkout

This task specifies the UI components, state management, and validation logic required to render and submit event-specific custom questionnaires (`form_schema`) during pass purchase and team checkouts.

---

## 1. Problem Context

Events can now define custom registration questionnaires via `events.form_schema` (stored as a JSON array of `FormFieldDefinition`). 

When a participant attempts to register:
* Backend endpoint `POST /api/purchases` validates that every field marked `required: true` has a non-empty answer in `items[].form_responses`.
* If answers are omitted, the backend throws a `400 VALIDATION_ERROR`:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Field \"GitHub Repository Link\" is required for registration to Hackathon"
    }
  }
  ```
* The frontend currently sends empty `items` without `form_responses`, which breaks checkout for any event with required questions.

---

## 2. Components to Implement

### 2.1 `<FormFieldRenderer />`
Create at: `frontend/components/forms/FormFieldRenderer.tsx`

**Props**:
```ts
interface FormFieldRendererProps {
  field: FormFieldDefinition;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}
```

**Supported Field Types**:
1. `text`: Standard text input (`<input type="text" ... />`).
2. `number`: Numeric input with min/max support.
3. `email`: Email input with regex validation (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
4. `url`: URL input (e.g., GitHub, Portfolio, Figma link), validates `http://` or `https://`.
5. `tel`: Phone number input.
6. `textarea`: Multi-line text area (e.g., project pitch, experience).
7. `select`: Dropdown `<select>` rendering `field.options`.

**Visual Styling**:
Matches the dark futuristic aesthetic (`bg-white/[0.04]`, `border-white/10`, focus states with `focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400`, red helper text on validation errors).

---

### 2.2 `<DynamicQuestionnaireModal />`
Create at: `frontend/components/forms/DynamicQuestionnaireModal.tsx`

**Props**:
```ts
interface DynamicQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  formSchema: FormFieldDefinition[];
  onSubmit: (responses: Record<string, any>) => Promise<void>;
  isSubmitting: boolean;
}
```

**State & Validation**:
* Local state `responses: Record<string, any>` mapping `field.id -> answer`.
* Local state `errors: Record<string, string>` mapping `field.id -> errorMessage`.
* **Validation Algorithm on Submit**:
  ```ts
  const newErrors: Record<string, string> = {};
  for (const field of formSchema) {
    const val = responses[field.id];
    if (field.required && (val === undefined || val === null || String(val).trim() === "")) {
      newErrors[field.id] = `${field.label} is required.`;
      continue;
    }
    if (val && field.type === "url") {
      try {
        new URL(String(val));
      } catch {
        newErrors[field.id] = "Please enter a valid URL (e.g., https://example.com).";
      }
    }
    if (val && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
      newErrors[field.id] = "Please enter a valid email address.";
    }
  }
  ```
* If validation succeeds, triggers `onSubmit(responses)`.

---

## 3. Integration Points

### 3.1 Solo Registration in `frontend/app/events/[slug]/page.tsx`

Modify `handleSoloRegister`:
```ts
// 1. Parse event form_schema if present
const parsedSchema: FormFieldDefinition[] = useMemo(() => {
  if (!event?.form_schema) return [];
  try {
    const parsed = JSON.parse(event.form_schema);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}, [event?.form_schema]);

// 2. Click handler:
const handleRegisterClick = () => {
  if (!user) {
    router.push(`/login?redirect=/events/${slug}`);
    return;
  }
  if (!user.profile_complete) {
    router.push("/profile-completion");
    return;
  }

  // If questions exist, trigger modal first:
  if (parsedSchema.length > 0) {
    setShowQuestionnaireModal(true);
  } else {
    // No questions, execute checkout directly:
    void executeCheckout({});
  }
};

// 3. Checkout execution with responses:
const executeCheckout = async (responses: Record<string, any>) => {
  const res = await fetch(`${API_BASE}/api/purchases`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          item_type: "EVENT_PASS",
          event_id: event.id,
          form_responses: Object.keys(responses).length > 0 ? responses : undefined,
        },
      ],
      acknowledge_student_id_policy: user.is_student,
    }),
  });
  // ... handle 201 Created or 400 Validation Error ...
};
```

---

### 3.2 Team Checkout in `frontend/app/teams/[id]/page.tsx`

When the team leader clicks **"Proceed to checkout"**:
1. Retrieve `team.event_id`. If the event has `form_schema`, display the questionnaire modal to the team leader.
2. Submit responses in:
   ```ts
   items: [
     {
       item_type: "EVENT_PASS",
       event_id: team.event_id,
       team_id: team.id,
       form_responses: responses,
     },
   ]
   ```

---

### 3.3 Viewing Submitted Answers in `frontend/app/me/registrations/page.tsx`

Add an accordion or drawer to registration cards:
* If `registration.form_responses` exists (parsed as JSON):
  * Render a clean list of answered questions:
    ```tsx
    <div className="mt-3 rounded-xl bg-white/[0.03] p-3 text-xs">
      <p className="font-semibold text-white/70">Custom Questionnaire Answers:</p>
      <div className="mt-2 space-y-1">
        {Object.entries(parsedResponses).map(([key, val]) => (
          <div key={key} className="flex justify-between text-white/50">
            <span className="capitalize">{key.replace(/_/g, " ")}:</span>
            <span className="text-white/80 font-medium">{String(val)}</span>
          </div>
        ))}
      </div>
    </div>
    ```

---

## 4. Backend Request & Response Contract

### Request: `POST /api/purchases`
* **Headers**: `Content-Type: application/json`, `Cookie: session=...`
* **Payload**:
  ```json
  {
    "items": [
      {
        "item_type": "EVENT_PASS",
        "event_id": "evt_ai_hackathon_2026",
        "form_responses": {
          "github_url": "https://github.com/techxetra/submission",
          "team_track": "Generative AI",
          "tshirt_size": "XL"
        }
      }
    ],
    "acknowledge_student_id_policy": true
  }
  ```

### Response: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "pur_abc123",
    "status": "AWAITING_PAYMENT",
    "total_amount_paise": 30000,
    "reservation_expires_at": 1793924100000
  }
}
```

### Error: `400 Bad Request` (`VALIDATION_ERROR`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field \"GitHub Repository Link\" is required for registration to Hackathon"
  }
}
```
* **Frontend Handling**: Highlights the specific question field in red and displays the backend error message in an alert banner.
