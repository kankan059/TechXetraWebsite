# Task 01: TypeScript Types & API Client Services

This task establishes the type contracts and API client service methods needed across the entire frontend to communicate with the event committee and dynamic form backend endpoints.

---

## 1. Domain Types (`frontend/types/api.ts`)

Add the following interfaces and type extensions to [`frontend/types/api.ts`](file:///home/ppriyankuu/Projects/TechXetraWebsite/frontend/types/api.ts):

### 1.1 Dynamic Form Schema Types
```ts
export type FormFieldType =
  | "text"
  | "number"
  | "email"
  | "tel"
  | "url"
  | "textarea"
  | "select";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldDefinition {
  id: string; // Unique key, e.g. "github_url", "tshirt_size"
  label: string; // User-facing question, e.g. "GitHub Repository Link"
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  options?: FormFieldOption[]; // Only used when type === 'select'
  description?: string; // Optional helper text
}
```

### 1.2 Update Existing Interfaces
```ts
// In EventItem and AdminEvent:
export interface EventItem {
  // ... existing fields ...
  form_schema?: string | null; // JSON string of FormFieldDefinition[]
}

// In Registration:
export interface Registration {
  // ... existing fields ...
  form_responses?: string | Record<string, any> | null; // JSON string or parsed object
}

// In PurchaseItemInput:
export interface PurchaseItemInput {
  item_type: "GATE_PASS" | "EVENT_PASS";
  event_id?: string;
  team_id?: string;
  form_responses?: Record<string, any>; // Key-value answers corresponding to form_schema question IDs
}
```

### 1.3 Staff Committee & Event Dashboard Types
```ts
export interface StaffEventSummary {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  role: "LEAD" | "VOLUNTEER" | "SUPER_ADMIN";
  day_of_event: number;
  venue: string | null;
  status: EventStatus;
  capacity: number | null;
  seats_taken: number;
  seats_remaining: number | null;
  confirmed_registrations_count: number;
  reserved_registrations_count: number;
  pending_payments_count: number;
}

export interface EventStaffMember {
  role: "LEAD" | "VOLUNTEER";
  assigned_at: number;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface StaffEventDashboard {
  event: EventItem;
  metrics: {
    confirmed_count: number;
    reserved_count: number;
    checked_in_count: number;
    pending_payments_count: number;
    seats_remaining: number | null;
  };
  staff: EventStaffMember[];
}

export interface EventRegistrationDetail {
  registration_id: string;
  status: "RESERVED" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  seat_count: number;
  registered_at: number;
  participant: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    institution_name: string | null;
    institution_id: string | null;
  };
  team: {
    id: string;
    name: string;
  } | null;
  ticket: {
    id: string;
    status: string;
    checked_in: boolean;
    checked_in_at: number | null;
  } | null;
  form_responses: Record<string, any> | null;
}

export interface StaffEventPayment {
  payment_id: string;
  purchase_id: string;
  transaction_id: string;
  expected_amount_paise: number;
  payment_status: "PENDING" | "SUCCESS" | "FAILED" | "ON_HOLD" | "WITHDRAWN";
  rejection_reason: string | null;
  submitted_at: number;
  reviewed_at: number | null;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  total_amount_paise: number;
  purchase_status: string;
}

export interface ReviewStaffPaymentBody {
  action: "APPROVE" | "REJECT" | "HOLD";
  reason?: string;
}

export interface LeadUpdateEventBody {
  description?: string | null;
  venue?: string | null;
  metadata?: string | null;
  form_schema?: string | null;
  registration_closes_at?: number | null;
}
```

---

## 2. Staff API Service (`frontend/services/staff-api.ts`)

Expand [`frontend/services/staff-api.ts`](file:///home/ppriyankuu/Projects/TechXetraWebsite/frontend/services/staff-api.ts) with the `events` namespace:

```ts
import { apiRequest } from "@/lib/api-client";
import type {
  StaffEventSummary,
  StaffEventDashboard,
  EventRegistrationDetail,
  StaffEventPayment,
  ReviewStaffPaymentBody,
  LeadUpdateEventBody,
  EventItem,
} from "@/types/api";

export const staffApi = {
  // ... existing scan and scores namespaces ...

  events: {
    /**
     * GET /api/staff/events/mine
     * Returns list of events assigned to current staff user (or all events for SUPER_ADMIN)
     */
    listMine: () =>
      apiRequest<StaffEventSummary[]>("/api/staff/events/mine"),

    /**
     * GET /api/staff/events/:id/dashboard
     * Returns live metrics, capacity stats, and assigned staff roster
     */
    getDashboard: (eventId: string) =>
      apiRequest<StaffEventDashboard>(
        `/api/staff/events/${encodeURIComponent(eventId)}/dashboard`
      ),

    /**
     * GET /api/staff/events/:id/registrations
     * Returns attendee roster with contact details, check-in state, and custom questionnaire answers
     */
    getRegistrations: (eventId: string, search?: string) => {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiRequest<EventRegistrationDetail[]>(
        `/api/staff/events/${encodeURIComponent(eventId)}/registrations${query}`
      );
    },

    /**
     * GET /api/staff/events/:id/payments
     * Returns payment verification queue for orders containing this event
     */
    getPayments: (eventId: string, status?: string) => {
      const query = status ? `?status=${encodeURIComponent(status)}` : "";
      return apiRequest<StaffEventPayment[]>(
        `/api/staff/events/${encodeURIComponent(eventId)}/payments${query}`
      );
    },

    /**
     * POST /api/staff/events/:id/payments/:paymentId/review
     * Lead reviews attendee payment (APPROVE, REJECT, or HOLD)
     */
    reviewPayment: (
      eventId: string,
      paymentId: string,
      body: ReviewStaffPaymentBody
    ) =>
      apiRequest<{ success: boolean; message: string }>(
        `/api/staff/events/${encodeURIComponent(eventId)}/payments/${encodeURIComponent(paymentId)}/review`,
        {
          method: "POST",
          body,
        }
      ),

    /**
     * PATCH /api/staff/events/:id
     * Lead updates venue, description, rules, form_schema, or registration deadline
     */
    update: (eventId: string, body: LeadUpdateEventBody) =>
      apiRequest<EventItem>(
        `/api/staff/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          body,
        }
      ),
  },
};
```

---

## 3. Super Admin API Service (`frontend/services/admin-api.ts`)

Add the missing event methods to `adminApi.events` in [`frontend/services/admin-api.ts`](file:///home/ppriyankuu/Projects/TechXetraWebsite/frontend/services/admin-api.ts):

```ts
  events: {
    // ... existing list, create, assignStaff, removeStaff, reopenScores ...

    /**
     * DELETE /api/admin/events/:id
     * Safely deletes event (hard-deletes if 0 attendees; sets CANCELLED if attendees exist)
     */
    delete: (eventId: string) =>
      apiRequest<{ deleted: boolean; status: "DELETED" | "CANCELLED"; message: string }>(
        `/api/admin/events/${encodeURIComponent(eventId)}`,
        {
          method: "DELETE",
        }
      ),

    /**
     * GET /api/admin/events/:id/staff
     * Lists assigned staff members for an event
     */
    listStaff: (eventId: string) =>
      apiRequest<Array<{ user_id: string; role: "LEAD" | "VOLUNTEER"; name: string; email: string }>>(
        `/api/admin/events/${encodeURIComponent(eventId)}/staff`
      ),

    /**
     * PATCH /api/admin/events/:id
     * Full Super Admin update across pricing, capacity, dates, status, and form schema
     */
    fullUpdate: (eventId: string, body: Record<string, any>) =>
      apiRequest<AdminEvent>(
        `/api/admin/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          body,
        }
      ),
  },
```
