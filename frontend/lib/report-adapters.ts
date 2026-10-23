import type {
    AttendanceReport,
    PendingVerificationReport,
    SalesReport,
} from "@/types/api";

type Obj = Record<string, unknown>;

const obj = (v: unknown): Obj =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};

const arr = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);

const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown): string => (v == null ? "" : String(v));

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET /admin/reports/attendance
 * backend: { turnstile: {gateCheckIns, eventCheckIns, deniedScans},
 *            eventBreakdown: [{eventId, title, actualCheckedIn, ...}] }
 */
export function adaptAttendanceReport(raw: unknown): AttendanceReport {
    const r = obj(raw);
    const turnstile = obj(r.turnstile);

    const eventAdmissions = Array.isArray(r.event_admissions)
        ? (r.event_admissions as AttendanceReport["event_admissions"])
        : arr(r.eventBreakdown).map((e) => ({
            event_id: str(e.eventId),
            event_title: str(e.title),
            // Backend does not return the fest day yet (see optional backend tweak)
            day_of_event: num(e.festDay),
            admissions_count: num(e.actualCheckedIn),
        }));

    return {
        // Backend has no per-day gate breakdown, so this is empty unless added
        gate_admissions_by_day: Array.isArray(r.gate_admissions_by_day)
            ? (r.gate_admissions_by_day as AttendanceReport["gate_admissions_by_day"])
            : [],
        event_admissions: eventAdmissions,
        // Backend gives total ADMITTED gate scans, not de-duplicated attendees
        unique_gate_attendees_count:
            r.unique_gate_attendees_count != null
                ? num(r.unique_gate_attendees_count)
                : num(turnstile.gateCheckIns),
    };
}

/**
 * GET /admin/reports/financial
 * backend: { totalRevenuePaise, tierBreakdown, paymentMethods: {upiOrders, freeOrders} }
 */
export function adaptSalesReport(raw: unknown): SalesReport {
    const r = obj(raw);
    const methods = obj(r.paymentMethods);

    return {
        totals_by_status: Array.isArray(r.totals_by_status)
            ? (r.totals_by_status as SalesReport["totals_by_status"])
            : [],
        paid_total_amount_paise:
            r.paid_total_amount_paise != null
                ? num(r.paid_total_amount_paise)
                : num(r.totalRevenuePaise),
        paid_count:
            r.paid_count != null
                ? num(r.paid_count)
                : num(methods.upiOrders) + num(methods.freeOrders),
        items_breakdown: Array.isArray(r.items_breakdown)
            ? (r.items_breakdown as SalesReport["items_breakdown"])
            : [],
    };
}

/**
 * GET /admin/payments?status=...
 * backend: a plain array of
 *   { id, purchaseId, amountPaise, transactionId, status, createdAt, buyer }
 */
export function adaptPendingReport(raw: unknown): PendingVerificationReport {
    const r = obj(raw);

    // Already in the expected shape
    if (!Array.isArray(raw) && r.pending_count != null) {
        return raw as PendingVerificationReport;
    }

    const list = Array.isArray(raw) ? arr(raw) : arr(r.payments ?? r.items);
    const now = Date.now();

    const items = list.map((p) => {
        const buyer = obj(p.buyer);
        const createdAt = num(p.createdAt);
        const age = createdAt > 0 ? Math.max(0, now - createdAt) : 0;
        return {
            payment_id: str(p.id),
            purchase_id: str(p.purchaseId),
            expected_amount_paise: num(p.amountPaise),
            transaction_id: p.transactionId ? str(p.transactionId) : null,
            status: str(p.status),
            created_at: createdAt,
            buyer_id: str(buyer.id),
            buyer_name: str(buyer.name),
            buyer_email: str(buyer.email),
            age_ms: age,
            is_overdue: age > DAY_MS,
        };
    });

    const timestamps = items.map((i) => i.created_at).filter((t) => t > 0);
    const oldest = timestamps.length ? Math.min(...timestamps) : null;

    return {
        pending_count: items.length,
        oldest_timestamp: oldest,
        oldest_age_ms: oldest ? Math.max(0, now - oldest) : null,
        overdue_count: items.filter((i) => i.is_overdue).length,
        items,
    };
}