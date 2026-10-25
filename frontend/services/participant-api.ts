// hello world
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
  CreatePurchaseResponse
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

export function normalizeEventItem(raw: any): EventItem {
  if (!raw || typeof raw !== "object") return raw;

  const isTeam = Boolean(
    raw.isTeam ?? raw.is_team_event ?? raw.isTeamEvent ?? false,
  );
  const minTeamSize = raw.minTeamSize ?? raw.min_team_size ?? 1;
  const maxTeamSize = raw.maxTeamSize ?? raw.max_team_size ?? (isTeam ? 4 : 1);
  const priceModel = raw.priceModel ?? raw.price_model ?? "FREE";
  const pricePaise = raw.pricePaise ?? raw.price_paise ?? 0;
  const studentPricePaise =
    raw.studentPricePaise ?? raw.student_price_paise ?? pricePaise;
  const festDay = raw.festDay ?? raw.day_of_event ?? 1;

  // Synthesize metadata if not provided or empty
  let metadataString = raw.metadata;
  if (!metadataString || typeof metadataString !== "string") {
    const syntheticMeta: Record<string, any> = {
      summary: raw.shortDescription || raw.description || "",
      organizer: raw.organizer || undefined,
      eligibility: raw.eligibility || undefined,
      rules:
        typeof raw.rules === "string"
          ? raw.rules
            .split("\n")
            .map((r: string) => r.trim())
            .filter(Boolean)
          : Array.isArray(raw.rules)
            ? raw.rules
            : [],
      prizes: raw.prizes || [],
      timeline: raw.timeline || [],
    };

    if (Array.isArray(raw.prizes) && raw.prizes.length > 0) {
      const firstPrize = raw.prizes[0];
      if (firstPrize?.total_prize_pool_inr) {
        syntheticMeta.prize = `₹${firstPrize.total_prize_pool_inr.toLocaleString("en-IN")}`;
        syntheticMeta.prize_pool_inr = firstPrize.total_prize_pool_inr;
      }
    }

    metadataString = JSON.stringify(syntheticMeta);
  }

  return {
    ...raw,
    // Day
    day_of_event: festDay,
    festDay: festDay,

    // Team
    is_team_event: isTeam,
    isTeam: isTeam,
    isTeamEvent: isTeam,
    min_team_size: minTeamSize,
    minTeamSize: minTeamSize,
    max_team_size: maxTeamSize,
    maxTeamSize: maxTeamSize,

    // Pricing
    price_model: priceModel,
    priceModel: priceModel,
    price_paise: pricePaise,
    pricePaise: pricePaise,
    student_price_paise: studentPricePaise,
    studentPricePaise: studentPricePaise,

    // Capacity & seats
    seats_taken: raw.seatsTaken ?? raw.seats_taken ?? 0,
    seatsTaken: raw.seatsTaken ?? raw.seats_taken ?? 0,
    seats_remaining:
      raw.seatsRemaining ?? raw.seats_remaining ?? raw.availableCapacity ?? null,
    seatsRemaining:
      raw.seatsRemaining ?? raw.seats_remaining ?? raw.availableCapacity ?? null,
    availableCapacity:
      raw.availableCapacity ?? raw.seatsRemaining ?? raw.seats_remaining ?? null,

    // Status & dates
    registration_open: Boolean(
      raw.registrationOpen ?? raw.registration_open ?? true,
    ),
    registrationOpen: Boolean(
      raw.registrationOpen ?? raw.registration_open ?? true,
    ),
    scoring_enabled: Boolean(
      raw.scoringEnabled ?? raw.scoring_enabled ?? false,
    ),
    scoringEnabled: Boolean(
      raw.scoringEnabled ?? raw.scoring_enabled ?? false,
    ),
    leaderboard_public: Boolean(
      raw.leaderboardPublic ?? raw.leaderboard_public ?? false,
    ),
    leaderboardPublic: Boolean(
      raw.leaderboardPublic ?? raw.leaderboard_public ?? false,
    ),

    starts_at: raw.startsAt ?? raw.starts_at ?? 0,
    startsAt: raw.startsAt ?? raw.starts_at ?? 0,
    ends_at: raw.endsAt ?? raw.ends_at ?? 0,
    endsAt: raw.endsAt ?? raw.ends_at ?? 0,
    registration_closes_at:
      raw.registrationClosesAt ?? raw.registration_closes_at ?? null,
    registrationClosesAt:
      raw.registrationClosesAt ?? raw.registration_closes_at ?? null,

    // Descriptions & metadata
    shortDescription: raw.shortDescription ?? raw.short_description ?? null,
    rules: raw.rules ?? null,
    prizes: raw.prizes ?? [],
    timeline: raw.timeline ?? [],
    organizer: raw.organizer ?? null,
    eligibility: raw.eligibility ?? null,
    metadata: metadataString,

    form_schema:
      raw.form_schema ??
      (raw.formSchema
        ? typeof raw.formSchema === "string"
          ? raw.formSchema
          : JSON.stringify(raw.formSchema)
        : null),
    formSchema: raw.formSchema ?? raw.form_schema ?? null,
  };
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
    list: async (
      params?: Record<string, QueryValue>,
    ): Promise<{ events: EventItem[]; next_cursor: string | null; total?: number }> => {
      const sanitized = { ...params };
      if (sanitized.limit && Number(sanitized.limit) > 100) {
        sanitized.limit = 100;
      }
      const raw = await apiRequest<
        | EventItem[]
        | { events?: EventItem[]; items?: EventItem[]; next_cursor?: string | null; total?: number }
      >(`/events${queryString(sanitized)}`);

      let items: EventItem[] = [];
      let nextCursor: string | null = null;
      let total: number | undefined = undefined;

      if (Array.isArray(raw)) {
        items = raw;
        total = raw.length;
      } else if (raw && Array.isArray(raw.events)) {
        items = raw.events;
        nextCursor = raw.next_cursor ?? null;
        total = raw.total ?? items.length;
      } else if (raw && Array.isArray(raw.items)) {
        items = raw.items;
        total = raw.total ?? items.length;
      }

      const normalized = items.map(normalizeEventItem);

      return {
        events: normalized,
        next_cursor: nextCursor,
        total: total ?? normalized.length,
      };
    },
    get: async (idOrSlug: string) => {
      const raw = await apiRequest<EventItem>(`/events/${encodeURIComponent(idOrSlug)}`);
      return normalizeEventItem(raw);
    },
    leaderboards: async () => {
      return participantApi.events.list({ limit: 50 });
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
      apiRequest<CreatePurchaseResponse>("/purchases", {
        method: "POST",
        body,
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : {},
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
    myTickets: async (): Promise<UserTicketsResponse> => {
      const raw = await apiRequest<unknown>("/tickets/mine");
      const list: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { tickets?: unknown[] })?.tickets)
          ? (raw as { tickets: unknown[] }).tickets
          : [];
      const now = Date.now();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tickets = list.map((t: any) => {
        const validFrom = Number(t.validFrom ?? t.valid_from ?? 0);
        const validTo = Number(t.validTo ?? t.valid_to ?? 0);
        const status = String(t.status ?? "ACTIVE");
        const state =
          status === "REVOKED"
            ? "REVOKED"
            : status === "REPLACED"
              ? "REPLACED"
              : now < validFrom
                ? "UPCOMING"
                : now > validTo
                  ? "EXPIRED"
                  : "VALID";

        return {
          ...t,
          purchase_item_id: t.purchaseItemId ?? t.purchase_item_id,
          ticket_type: t.itemType ?? t.ticket_type,
          ticketType: t.itemType ?? t.ticket_type,
          qr_token: t.qrToken ?? t.qr_token,
          qr_version: t.qrVersion ?? t.qr_version,
          event_checked_in_at: t.eventCheckedInAt ?? t.event_checked_in_at ?? null,
          created_at: t.createdAt ?? t.created_at,
          updated_at: t.updatedAt ?? t.updated_at,
          student_id_warning: t.student_id_warning ?? null,
          validity: {
            valid_from: validFrom,
            valid_to: validTo,
            state,
            is_currently_valid: state === "VALID",
          },
        } as DigitalTicket;
      });

      return { tickets, preparing_tickets: [] };
    },
    get: (ticketId: string) =>
      apiRequest<DigitalTicket>(
        `/tickets/${encodeURIComponent(ticketId)}`,
      ),
  },

  registrations: {
    list: () => apiRequest<Registration[]>("/me/registrations"),
  },
};
