import { apiRequest } from "@/lib/api-client";
import type {
  UserProfile,
  FestCatalog,
  EventItem,
  LeaderboardResponse,
  TeamDetail,
  TeamMember,
  PurchaseDetail,
  PaymentInstructions,
  PaymentRecord,
  UserTicketsResponse,
  DigitalTicket,
  Registration,
} from "@/types/api";

type QueryValue = string | number | boolean | undefined;

function queryString(params: Record<string, QueryValue> = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const q = searchParams.toString();
  return q ? `?${q}` : "";
}

export const participantApi = {
  // Module 01: Auth & Profile
  auth: {
    me: () => apiRequest<UserProfile>("/api/me"),
    updateProfile: (body: {
      name?: string;
      phone?: string;
      is_student?: boolean;
      institution_name?: string | null;
      institution_id?: string | null;
    }) =>
      apiRequest<UserProfile>("/api/me/profile", {
        method: "PATCH",
        body,
      }),
    logout: () =>
      apiRequest<{ logged_out: boolean }>("/api/auth/logout", {
        method: "POST",
      }),
  },

  // Module 02: Catalog & Events & Leaderboards
  catalog: {
    passes: () => apiRequest<FestCatalog>("/api/catalog/passes"),
  },

  events: {
    list: (params?: Record<string, QueryValue>) => {
      const sanitized = { ...params };
      if (sanitized.limit && Number(sanitized.limit) > 50) {
        sanitized.limit = 50;
      }
      return apiRequest<{ events: EventItem[]; next_cursor: string | null }>(
        `/api/events${queryString(sanitized)}`,
      );
    },
    get: (idOrSlug: string) =>
      apiRequest<EventItem>(`/api/events/${encodeURIComponent(idOrSlug)}`),
    leaderboards: () =>
      apiRequest<{ events: EventItem[] }>("/api/leaderboards"),
    eventLeaderboard: (idOrSlug: string) =>
      apiRequest<LeaderboardResponse>(
        `/api/events/${encodeURIComponent(idOrSlug)}/leaderboard`,
      ),
  },

  // Module 03: Teams & Invitations
  teams: {
    create: (body: { event_id: string; name: string }) =>
      apiRequest<TeamDetail>("/api/teams", {
        method: "POST",
        body,
      }),
    get: (teamId: string) =>
      apiRequest<TeamDetail>(`/api/teams/${encodeURIComponent(teamId)}`),
    disband: (teamId: string) =>
      apiRequest<{ cancelled: boolean }>(
        `/api/teams/${encodeURIComponent(teamId)}`,
        {
          method: "DELETE",
        },
      ),
    invite: (teamId: string, email: string) =>
      apiRequest<TeamMember>(
        `/api/teams/${encodeURIComponent(teamId)}/invites`,
        {
          method: "POST",
          body: { email },
        },
      ),
    removeMember: (teamId: string, memberId: string) =>
      apiRequest<{ removed: boolean }>(
        `/api/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
        {
          method: "DELETE",
        },
      ),
    myTeams: () => apiRequest<TeamDetail[]>("/api/me/teams"),
    myInvites: () => apiRequest<TeamMember[]>("/api/me/team-invites"),
    acceptInvite: (memberId: string) =>
      apiRequest<{ accepted: boolean }>(
        `/api/team-invites/${encodeURIComponent(memberId)}/accept`,
        {
          method: "POST",
        },
      ),
    declineInvite: (memberId: string) =>
      apiRequest<{ declined: boolean }>(
        `/api/team-invites/${encodeURIComponent(memberId)}/decline`,
        {
          method: "POST",
        },
      ),
  },

  // Module 04: Purchases & Tickets
  purchases: {
    create: (
      body: {
        items: {
          item_type: "GATE_PASS" | "EVENT_PASS";
          event_id?: string;
          team_id?: string;
        }[];
        acknowledge_student_id_policy?: boolean;
      },
      idempotencyKey?: string,
    ) =>
      apiRequest<PurchaseDetail>("/api/purchases", {
        method: "POST",
        body,
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
      }),
    list: () => apiRequest<PurchaseDetail[]>("/api/purchases"),
    get: (purchaseId: string) =>
      apiRequest<PurchaseDetail>(
        `/api/purchases/${encodeURIComponent(purchaseId)}`,
      ),
    cancel: (purchaseId: string) =>
      apiRequest<{ cancelled: boolean }>(
        `/api/purchases/${encodeURIComponent(purchaseId)}/cancel`,
        {
          method: "POST",
        },
      ),
    paymentInstructions: (purchaseId: string) =>
      apiRequest<PaymentInstructions>(
        `/api/purchases/${encodeURIComponent(purchaseId)}/payment-instructions`,
      ),
    submitPayment: (
      purchaseId: string,
      transactionId: string,
      idempotencyKey?: string,
    ) =>
      apiRequest<PaymentRecord>(
        `/api/purchases/${encodeURIComponent(purchaseId)}/payment`,
        {
          method: "POST",
          body: { transaction_id: transactionId },
          headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
        },
      ),
    withdrawPayment: (paymentId: string) =>
      apiRequest<{ withdrawn: boolean }>(
        `/api/payments/${encodeURIComponent(paymentId)}/withdraw`,
        {
          method: "POST",
        },
      ),
    retryFulfillment: (purchaseId: string) =>
      apiRequest<{ fulfilled: boolean }>(
        `/api/purchases/${encodeURIComponent(purchaseId)}/retry-fulfillment`,
        {
          method: "POST",
        },
      ),
  },

  tickets: {
    myTickets: () => apiRequest<UserTicketsResponse>("/api/tickets/me"),
    get: (ticketId: string) =>
      apiRequest<DigitalTicket>(
        `/api/tickets/${encodeURIComponent(ticketId)}`,
      ),
  },

  registrations: {
    list: () => apiRequest<Registration[]>("/api/registrations"),
  },
};
