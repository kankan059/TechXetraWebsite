import { apiRequest } from "@/lib/api-client";
import { normalizeEventItem } from "@/services/participant-api";
import type {
  ScanLookupResult,
  ScanAdmitResult,
  ScanDenyResult,
  EsportsScore,
  StaffEventSummary,
  StaffEventDashboard,
  EventRegistrationDetail,
  StaffEventPayment,
  ReviewStaffPaymentBody,
  LeadUpdateEventBody,
  EventItem,
} from "@/types/api";

export const staffApi = {
  scan: {
    lookup: (body: {
      token?: string;
      qrToken?: string;
      qr_token?: string;
      context: "GATE" | "EVENT";
      event_id?: string;
      eventId?: string;
    }) => {
      const qrToken = body.qrToken || body.qr_token || body.token || "";
      const eventId = body.eventId || body.event_id;
      return apiRequest<ScanLookupResult>("/staff/scan/lookup", {
        method: "POST",
        body: {
          qrToken,
          context: body.context,
          ...(eventId ? { eventId } : {}),
        },
      });
    },

    admit: (body: {
      token?: string;
      qrToken?: string;
      qr_token?: string;
      context: "GATE" | "EVENT";
      event_id?: string;
      eventId?: string;
      student_id_checked?: boolean;
      studentIdChecked?: boolean;
      client_scan_id?: string;
    }) => {
      const qrToken = body.qrToken || body.qr_token || body.token || "";
      const eventId = body.eventId || body.event_id;
      const studentIdChecked = body.studentIdChecked ?? body.student_id_checked;
      return apiRequest<ScanAdmitResult>("/staff/scan/check-in", {
        method: "POST",
        body: {
          qrToken,
          context: body.context,
          ...(eventId ? { eventId } : {}),
          ...(studentIdChecked !== undefined ? { studentIdChecked } : {}),
          ...(body.client_scan_id ? { client_scan_id: body.client_scan_id } : {}),
        },
      });
    },

    deny: async (body: {
      token?: string;
      qrToken?: string;
      context: "GATE" | "EVENT";
      reason: string;
      event_id?: string;
      client_scan_id?: string;
    }): Promise<ScanDenyResult> => {
      // Backend scanner is verdict-based (lookup returns validity; admission is mutation).
      // Backend has no /staff/scan/deny mutation route.
      return {
        success: true,
        verdict: "DENIED",
        ticket_id: "",
        log_id: `local-deny-${Date.now()}`,
        context: body.context,
        reason: body.reason,
        denied_at: Date.now(),
      };
    },
  },

  scores: {
    get: (eventId: string) =>
      apiRequest<{
        event: {
          id: string;
          slug: string;
          title: string;
          category: string;
          scoring_enabled: number | boolean;
          scoring_status: string;
          max_rounds: number;
        };
        scores: EsportsScore[];
        history: unknown[];
      }>(`/staff/events/${encodeURIComponent(eventId)}/matches`),

    upsert: (
      eventId: string,
      body: {
        registration_id: string;
        round_no: number;
        score: number;
        expected_version?: number;
        reason?: string;
      },
    ) =>
      apiRequest<EsportsScore>(
        `/staff/events/${encodeURIComponent(eventId)}/scores`,
        {
          method: "POST",
          body,
        },
      ),

    delete: (eventId: string, entryId: string, reason: string) =>
      apiRequest<{ deleted: boolean }>(
        `/staff/events/${encodeURIComponent(eventId)}/scores/${encodeURIComponent(entryId)}`,
        {
          method: "DELETE",
          body: { reason },
        },
      ),

    finalize: (eventId: string) =>
      apiRequest<{ finalized: boolean }>(
        `/staff/events/${encodeURIComponent(eventId)}/finalize`,
        {
          method: "POST",
        },
      ),

    reopen: (eventId: string) =>
      apiRequest<{ reopened: boolean }>(
        `/staff/events/${encodeURIComponent(eventId)}/reopen`,
        {
          method: "POST",
        },
      ),
  },

  events: {
    listMine: () =>
      apiRequest<StaffEventSummary[]>("/staff/events/mine"),

    getDashboard: async (eventId: string): Promise<StaffEventDashboard> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await apiRequest<any>(
        `/staff/events/${encodeURIComponent(eventId)}/dashboard`,
      );
      const m = raw.metrics ?? {};
      return {
        event: normalizeEventItem(raw.event),
        metrics: {
          confirmed_count: Number(m.confirmedCount ?? 0),
          reserved_count: Number(m.reservedCount ?? 0),
          checked_in_count: Number(m.checkedInCount ?? 0),
          pending_payments_count: 0, // payment review is Super Admin only
          seats_remaining: raw.event?.seatsRemaining ?? null,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        staff: (raw.staffRoster ?? []).map((s: any) => ({
          user_id: s.userId,
          name: s.name,
          email: s.email,
          phone: null,
          role: s.role === "EVENT_LEAD" ? "LEAD" : s.role,
          assigned_at: s.assignedAt,
        })),
      };
    },

    getRegistrations: async (eventId: string, search?: string) => {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const raw = await apiRequest<any[]>(
        `/staff/events/${encodeURIComponent(eventId)}/participants${query}`,
      );
      return (raw ?? []).map((r): EventRegistrationDetail => ({
        registration_id: r.registrationId,
        status: r.registrationStatus,
        seat_count: r.seatCount,
        registered_at: r.confirmedAt,
        participant: {
          id: r.attendee?.id ?? "",
          name: r.attendee?.name ?? "",
          email: r.attendee?.email ?? "",
          phone: r.attendee?.phone ?? null,
          institution_name: r.attendee?.institutionName ?? null,
          institution_id: r.attendee?.institutionId ?? null,
        },
        team: r.team ? { id: r.team.id, name: r.team.name } : null,
        ticket: r.ticket
          ? {
            id: r.ticket.id,
            status: r.ticket.status,
            checked_in: !!r.ticket.checkedInAt,
            checked_in_at: r.ticket.checkedInAt ?? null,
          }
          : null,
        form_responses: r.formResponses ?? null,
      }));
    },

    getCheckIns: (eventId: string) =>
      apiRequest<unknown[]>(
        `/staff/events/${encodeURIComponent(eventId)}/check-ins`,
      ),

    getPayments: async (_eventId: string, _status?: string): Promise<StaffEventPayment[]> => {
      // Backend payment verification is restricted to Super Admin under /admin/payments.
      return [];
    },

    reviewPayment: async (
      _eventId: string,
      _paymentId: string,
      _body: ReviewStaffPaymentBody,
    ) => {
      throw new Error("Payment review is restricted to Super Admin.");
    },

    update: (eventId: string, body: LeadUpdateEventBody) =>
      apiRequest<EventItem>(
        `/staff/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          body,
        },
      ),
  },
};
