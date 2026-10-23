import { apiRequest } from "@/lib/api-client";
import type {
  UserProfile,
  SessionResponse,
  LoginRequest,
  RegisterRequest,
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
    session: () => apiRequest<SessionResponse>("/auth/session"),
    me: () => apiRequest<UserProfile>("/me"),
    login: (body: LoginRequest) =>
      apiRequest<{ user: UserProfile }>("/auth/login", {
        method: "POST",
        body,
      }),
    register: (body: RegisterRequest) =>
      apiRequest<{ user: UserProfile }>("/auth/register", {
        method: "POST",
        body,
      }),
    google: (idToken: string) =>
      apiRequest<{ user: UserProfile }>("/auth/google", {
        method: "POST",
        body: { idToken },
      }),
    updateProfile: (body: {
      name?: string;
      displayName?: string;
      phone?: string;
      isStudent?: boolean;
      is_student?: boolean;
      institutionName?: string | null;
      institution_name?: string | null;
      institutionId?: string | null;
      institution_id?: string | null;
      avatarUrl?: string | null;
    }) => {
      const payload: Record<string, unknown> = {};
      if (body.name !== undefined) payload.name = body.name;
      if (body.displayName !== undefined) payload.displayName = body.displayName;
      if (body.phone !== undefined) payload.phone = body.phone;
      if (body.isStudent !== undefined) payload.isStudent = body.isStudent;
      else if (body.is_student !== undefined) payload.isStudent = body.is_student;
      if (body.institutionName !== undefined) payload.institutionName = body.institutionName;
      else if (body.institution_name !== undefined) payload.institutionName = body.institution_name;
      if (body.institutionId !== undefined) payload.institutionId = body.institutionId;
      else if (body.institution_id !== undefined) payload.institutionId = body.institution_id;
      if (body.avatarUrl !== undefined) payload.avatarUrl = body.avatarUrl;

      return apiRequest<UserProfile>("/me", {
        method: "PATCH",
        body: payload,
      });
    },
    logout: () =>
      apiRequest<{ message?: string; logged_out?: boolean }>("/auth/logout", {
        method: "POST",
      }),
  },

  // Module 02: Catalog & Events & Leaderboards
  catalog: {
    passes: () => apiRequest<FestCatalog>("/catalog/passes"),
  },

  events: {
    list: (params?: Record<string, QueryValue>) => {
      const sanitized = { ...params };
      if (sanitized.limit && Number(sanitized.limit) > 100) {
        sanitized.limit = 100;
      }
      return apiRequest<{ events: EventItem[]; next_cursor: string | null; total?: number }>(
        `/events${queryString(sanitized)}`,
      );
    },
    get: (idOrSlug: string) =>
      apiRequest<EventItem>(`/events/${encodeURIComponent(idOrSlug)}`),
    leaderboards: async () => {
      // Backend does not have a global /leaderboards collection route.
      // Fetch public events with scoring enabled
      return apiRequest<{ events: EventItem[] }>("/events?limit=50");
    },
    eventLeaderboard: (idOrSlug: string) =>
      apiRequest<LeaderboardResponse>(
        `/events/${encodeURIComponent(idOrSlug)}/leaderboard`,
      ),
  },

  // Module 03: Teams & Invitations
  teams: {
    create: (body: { event_id?: string; eventId?: string; name: string }) =>
      apiRequest<TeamDetail>("/teams", {
        method: "POST",
        body: {
          eventId: body.eventId || body.event_id,
          name: body.name,
        },
      }),
    get: (teamId: string) =>
      apiRequest<TeamDetail>(`/teams/${encodeURIComponent(teamId)}`),
    disband: (teamId: string) =>
      apiRequest<{ cancelled: boolean }>(
        `/teams/${encodeURIComponent(teamId)}`,
        {
          method: "DELETE",
        },
      ),
    invite: (teamId: string, email: string) =>
      apiRequest<TeamMember>(
        `/teams/${encodeURIComponent(teamId)}/invitations`,
        {
          method: "POST",
          body: { email },
        },
      ),
    removeMember: (teamId: string, memberId: string) =>
      apiRequest<{ removed: boolean }>(
        `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
        {
          method: "DELETE",
        },
      ),
    myTeams: () => apiRequest<TeamDetail[]>("/teams/mine"),
    myInvites: () => apiRequest<TeamMember[]>("/team-invites/mine"),
    acceptInvite: (invitationId: string) =>
      apiRequest<{ accepted: boolean }>(
        `/team-invites/${encodeURIComponent(invitationId)}/accept`,
        {
          method: "POST",
        },
      ),
    declineInvite: (invitationId: string) =>
      apiRequest<{ declined: boolean }>(
        `/team-invites/${encodeURIComponent(invitationId)}/decline`,
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
          item_type?: "GATE_PASS" | "EVENT_PASS";
          itemType?: "GATE_PASS" | "EVENT_PASS";
          event_id?: string;
          eventId?: string;
          team_id?: string;
          teamId?: string;
        }[];
        acknowledge_student_id_policy?: boolean;
        acknowledgeStudentIdPolicy?: boolean;
      },
      idempotencyKey?: string,
    ) =>
      apiRequest<PurchaseDetail>("/purchases", {
        method: "POST",
        body,
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
      }),
    list: () => apiRequest<PurchaseDetail[]>("/purchases/mine"),
    get: (purchaseId: string) =>
      apiRequest<PurchaseDetail>(
        `/purchases/${encodeURIComponent(purchaseId)}`,
      ),
    cancel: (purchaseId: string) =>
      apiRequest<{ cancelled: boolean }>(
        `/purchases/${encodeURIComponent(purchaseId)}/cancel`,
        {
          method: "POST",
        },
      ),
    paymentInstructions: (purchaseId: string) =>
      apiRequest<PaymentInstructions>(
        `/purchases/${encodeURIComponent(purchaseId)}/payment`,
      ),
    submitPayment: (
      purchaseId: string,
      transactionId: string,
      idempotencyKey?: string,
    ) =>
      apiRequest<PaymentRecord>(
        `/purchases/${encodeURIComponent(purchaseId)}/payment`,
        {
          method: "POST",
          body: { transactionId },
          headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
        },
      ),
    withdrawPayment: (purchaseId: string) =>
      apiRequest<{ withdrawn: boolean }>(
        `/purchases/${encodeURIComponent(purchaseId)}/payment/withdraw`,
        {
          method: "POST",
        },
      ),
    retryFulfillment: (purchaseId: string) =>
      apiRequest<{ fulfilled: boolean }>(
        `/admin/purchases/${encodeURIComponent(purchaseId)}/retry-fulfillment`,
        {
          method: "POST",
        },
      ),
  },

  tickets: {
    myTickets: () => apiRequest<UserTicketsResponse>("/tickets/mine"),
    get: (ticketId: string) =>
      apiRequest<DigitalTicket>(
        `/tickets/${encodeURIComponent(ticketId)}`,
      ),
  },

  registrations: {
    list: () => apiRequest<Registration[]>("/me/registrations"),
  },
};
