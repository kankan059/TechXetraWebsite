# Task 05: Event Lead Payment Verification Queue

This task specifies the payment queue and verification console at `/staff/events/[id]/payments`. It enables assigned Event Leads and Super Admins to review attendee UPI payment submissions, inspect UTR transaction IDs, and execute approval, rejection, or hold actions for orders containing their event.

---

## 1. Access Control & Invariants

> [!IMPORTANT]
> **Lead-Only Permission**: Only assigned **Event Leads** and **Super Admins** can access this queue. Volunteers attempting to access this page or endpoint will receive `403 FORBIDDEN`.

> [!WARNING]
> **Anti-Self-Review Invariant**: Reviewers cannot approve or reject their own payments. If `buyer_id === current_user.id`, review actions must be disabled in the UI with an explanatory alert.

---

## 2. Backend Endpoint Contracts

### 2.1 Fetch Payment Queue
* **Route**: `GET /api/staff/events/:id/payments`
* **Query Parameters**: `?status=PENDING` (optional filter: `PENDING`, `ON_HOLD`, `SUCCESS`, `FAILED`)
* **Auth**: Assigned `LEAD` or `SUPER_ADMIN`
* **Response Model**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "payment_id": "pay_01j8xyz",
      "purchase_id": "pur_01j8abc",
      "transaction_id": "412345678901",
      "expected_amount_paise": 30000,
      "payment_status": "PENDING",
      "rejection_reason": null,
      "submitted_at": 1793805000000,
      "reviewed_at": null,
      "buyer_id": "TX260088",
      "buyer_name": "Rohan Das",
      "buyer_email": "rohan@gmail.com",
      "buyer_phone": "9876543212",
      "total_amount_paise": 30000,
      "purchase_status": "PENDING_VERIFICATION"
    }
  ]
}
```

### 2.2 Submit Payment Review
* **Route**: `POST /api/staff/events/:id/payments/:paymentId/review`
* **Auth**: Assigned `LEAD` or `SUPER_ADMIN`
* **Payload**:
  ```json
  {
    "action": "APPROVE", // "APPROVE" | "REJECT" | "HOLD"
    "reason": "UTR verified in bank statement" // Optional for APPROVE/HOLD; Required for REJECT
  }
  ```
* **Response Model**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "payment_id": "pay_01j8xyz",
      "status": "SUCCESS",
      "purchase_status": "PAID",
      "reviewed_at": 1793806000000
    }
  }
  ```

---

## 3. Page Implementation: `frontend/app/staff/events/[id]/payments/page.tsx`

### UI Structure:

#### 1. Header & Filters:
* **Breadcrumb**: `Staff Portal / Events / [Event Title] / Payments`
* **Notice Banner**: *"You are reviewing attendee payments for [Event Title]. Verify the 12-digit UPI UTR against your committee bank transactions before approving."*
* **Status Filter Tabs**:
  * `Pending Review` (default, with badge showing count).
  * `On Hold` (awaiting clarification).
  * `Approved / Paid`.
  * `Rejected`.
  * `All`.

#### 2. Payment Cards / Table:
For each payment record:
* **Buyer Profile**:
  * Name & Sequential ID (`TX260088`).
  * Email & Phone number (with quick copy / call button).
* **Payment Details**:
  * **Expected Amount**: `₹(expected_amount_paise / 100).toFixed(2)` (e.g. `₹300.00`).
  * **UTR Transaction ID**: High-contrast mono badge with a one-click copy button:
    ```tsx
    <div className="flex items-center gap-2 font-mono text-sm bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/10">
      <span>{p.transaction_id}</span>
      <button onClick={() => navigator.clipboard.writeText(p.transaction_id)}>
        <Copy className="h-3.5 w-3.5 text-white/50 hover:text-white" />
      </button>
    </div>
    ```
  * **Submitted Timestamp**: e.g., *"15 minutes ago (11:20 AM)"*.
* **Status Badge**:
  * `PENDING` (amber), `ON_HOLD` (purple), `SUCCESS` (green), `FAILED` (red).
* **Action Buttons**:
  * If `buyer_id === current_user.id`:
    * Render disabled button with tooltip: *"You cannot review your own payment submission."*
  * If `payment_status === 'PENDING'` or `'ON_HOLD'`:
    * **Approve** button (green, prompts quick confirmation).
    * **Hold** button (amber, opens note dialog).
    * **Reject** button (red, opens reason dialog).

---

## 4. Modal: `<ReviewPaymentModal />`
Create at: `frontend/components/staff/ReviewPaymentModal.tsx`

**Props**:
```ts
interface ReviewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: StaffEventPayment | null;
  action: "APPROVE" | "REJECT" | "HOLD";
  onConfirm: (paymentId: string, action: "APPROVE" | "REJECT" | "HOLD", reason?: string) => Promise<void>;
  isSubmitting: boolean;
}
```

**Workflow**:
* **On APPROVE**:
  * Shows verification checklist:
    * [x] Expected amount matches receipt (`₹300.00`).
    * [x] UTR `412345678901` appears in UPI receiving account statement.
  * Confirmation button: *"Confirm Approval & Issue Tickets"*.
* **On REJECT**:
  * Requires selecting or typing a reason:
    * Dropdown presets:
      * *"UTR not found in bank statement."*
      * *"Amount received does not match expected pass fee."*
      * *"Duplicate UTR submission."*
    * Custom text area for committee explanation.
  * Confirmation button: *"Reject Payment"*.
* **On HOLD**:
  * Text area for internal query (e.g., *"Contacted bank for confirmation"*).
  * Confirmation button: *"Mark On Hold"*.
