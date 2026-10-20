export type SalesReport = {
  totals_by_status: {
    status: string;
    count: number;
    total_amount_paise: number;
  }[];
  paid_total_amount_paise: number;
  paid_count: number;
  items_breakdown: {
    item_type: string;
    tier: string;
    count: number;
    total_amount_paise: number;
  }[];
};

export type PendingVerificationReport = {
  pending_count: number;
  oldest_timestamp: number | null;
  oldest_age_ms: number | null;
  overdue_count: number;
  items: {
    payment_id: string;
    purchase_id: string;
    expected_amount_paise: number;
    transaction_id: string | null;
    status: string;
    created_at: number;
    buyer_id: string;
    buyer_name: string;
    buyer_email: string;
    age_ms: number;
    is_overdue: boolean;
  }[];
};

export type EventRegistrationsReport = {
  event_id: string;
  slug: string;
  title: string;
  category: string;
  day_of_event: number;
  capacity: number;
  seats_taken: number;
  confirmed_registrations_count: number;
  confirmed_seats_count: number;
  reserved_registrations_count: number;
  reserved_seats_count: number;
}[];

export type AttendanceReport = {
  gate_admissions_by_day: {
    day_number: number;
    date: string;
    admissions_count: number;
  }[];
  event_admissions: {
    event_id: string;
    event_title: string;
    day_of_event: number;
    admissions_count: number;
  }[];
  unique_gate_attendees_count: number;
};

export type DashboardSalesReport = SalesReport;
export type DashboardRegistrationReport = EventRegistrationsReport;
export type DashboardPaymentReport = PendingVerificationReport;
export type DashboardAttendanceReport = AttendanceReport;

export type AdminUser = Record<string, unknown>;
export type AdminEvent = Record<string, unknown>;
export type AdminPayment = Record<string, unknown>;
export type AdminTicket = Record<string, unknown>;
export type AdminRegistration = Record<string, unknown>;
export type AdminAuditLog = Record<string, unknown>;
export type AdminSettings = Record<string, unknown>;