import { apiRequest } from "@/lib/api-client";
import type {
  ScanLookupResult,
  ScanAdmitResult,
  ScanDenyResult,
  EsportsScore,
} from "@/types/api";

export const staffApi = {
  scan: {
    lookup: (body: { token: string; context: "GATE" | "EVENT"; event_id?: string }) =>
      apiRequest<ScanLookupResult>("/api/staff/scan/lookup", {
        method: "POST",
        body,
      }),

    admit: (body: {
      token: string;
      context: "GATE" | "EVENT";
      event_id?: string;
      student_id_checked?: boolean;
      client_scan_id?: string;
    }) =>
      apiRequest<ScanAdmitResult>("/api/staff/scan/admit", {
        method: "POST",
        body,
      }),

    deny: (body: {
      token: string;
      context: "GATE" | "EVENT";
      reason: string;
      event_id?: string;
      client_scan_id?: string;
    }) =>
      apiRequest<ScanDenyResult>("/api/staff/scan/deny", {
        method: "POST",
        body,
      }),
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
      }>(`/api/staff/events/${encodeURIComponent(eventId)}/scores`),

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
        `/api/staff/events/${encodeURIComponent(eventId)}/scores`,
        {
          method: "PUT",
          body,
        },
      ),

    delete: (eventId: string, entryId: string, reason: string) =>
      apiRequest<{ deleted: boolean }>(
        `/api/staff/events/${encodeURIComponent(eventId)}/scores/${encodeURIComponent(entryId)}`,
        {
          method: "DELETE",
          body: { reason },
        },
      ),

    finalize: (eventId: string) =>
      apiRequest<{ finalized: boolean }>(
        `/api/staff/events/${encodeURIComponent(eventId)}/scores/finalize`,
        {
          method: "POST",
        },
      ),
  },
};
