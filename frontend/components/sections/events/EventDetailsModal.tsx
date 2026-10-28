"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { EventItem } from "@/types/api";

type EventDetailsModalProps = {
  event: EventItem;
  onClose: () => void;
};

type EventMetadata = {
  image?: string;
  image_url?: string;
  poster?: string;
  prize?: string;
  rules?: string[];
};

function getMetadata(event: EventItem): EventMetadata {
  try {
    const metadata = event.metadata ? JSON.parse(event.metadata) : {};
    return metadata && typeof metadata === "object" ? metadata : {};
  } catch {
    return {};
  }
}

function getCategoryColor(category: string) {
  if (category === "TECHNICAL") return "#55DFFF";
  if (category === "E_SPORTS" || category === "SPORTS") return "#8FE388";
  if (category === "INTERACTIVE") return "#FBBF24";
  if (category === "RECREATIONAL") return "#2DD4BF";
  if (category === "SHOWCASE") return "#C084FC";
  if (category === "CULTURAL") return "#FB7185";
  return "#FF806E";
}

function formatDate(timestamp: number | null | undefined, day: number) {
  if (!timestamp) return `Day 0${day || 1}`;

  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timestamp: number | null | undefined) {
  if (!timestamp) return "Event Day Schedule";

  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFee(event: EventItem) {
  const price = event.price_paise ?? event.pricePaise ?? 0;

  if (event.price_model === "FREE" || price === 0) return "FREE";

  return `₹${(price / 100).toLocaleString("en-IN")} / ${
    event.price_model === "PER_TEAM" ? "team" : "person"
  }`;
}

function formatTeamSize(event: EventItem) {
  const isTeam = event.is_team_event ?? event.isTeamEvent ?? event.isTeam;

  if (!isTeam) return "Individual";

  const min = event.min_team_size ?? event.minTeamSize;
  const max = event.max_team_size ?? event.maxTeamSize;

  if (min === max) return `${min} members`;

  return `${min}–${max} members`;
}

function formatPrize(event: EventItem, metadata: EventMetadata) {
  if (metadata.prize) return metadata.prize;

  const prize = event.prizes?.[0];

  if (
    prize &&
    typeof prize === "object" &&
    "total_prize_pool_inr" in prize &&
    typeof prize.total_prize_pool_inr === "number"
  ) {
    return `₹${prize.total_prize_pool_inr.toLocaleString("en-IN")}`;
  }

  return "Trophies & Medals";
}

/* Small inline icons so the info cards scan quickly */
function Icon({ name }: { name: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "Date":
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
        </svg>
      );
    case "Time":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "Venue":
      return (
        <svg {...common}>
          <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      );
    case "Team size":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
          <path d="M16 5.2a3.2 3.2 0 0 1 0 6M18 14.8c2 .6 3.3 2.3 3.5 5.2" />
        </svg>
      );
    case "Entry fee":
      return (
        <svg {...common}>
          <path d="M6 4h12M6 9h12M9 4c4.5 0 6 2 6 5s-2.5 5-6.5 5H6l7 6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
          <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
        </svg>
      );
  }
}

export default function EventDetailsModal({
  event,
  onClose,
}: EventDetailsModalProps) {
  const metadata = getMetadata(event);
  const category = event.category.replaceAll("_", " ");
  const accent = getCategoryColor(event.category);

  const image =
    event.imageURL || metadata.image || metadata.image_url || metadata.poster;

  const rules = metadata.rules?.length
    ? metadata.rules
    : typeof event.rules === "string"
      ? event.rules
          .split("\n")
          .map((rule) => rule.trim())
          .filter(Boolean)
      : Array.isArray(event.rules)
        ? event.rules
        : [];

  const details: [string, string][] = [
    [
      "Date",
      formatDate(event.starts_at, event.festDay || event.day_of_event),
    ],
    ["Time", formatTime(event.starts_at)],
    ["Venue", event.venue || "To be announced"],
    ["Team size", formatTeamSize(event)],
    ["Entry fee", formatFee(event)],
    ["Prize", formatPrize(event, metadata)],
  ];

  // Lock background scroll while the modal is open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex touch-pan-y items-end justify-center overflow-hidden bg-black/80 backdrop-blur-md sm:items-start sm:px-5 sm:pb-5 sm:pt-24 lg:px-8 lg:pb-8 lg:pt-24"
      onMouseDown={(click) => {
        if (click.target === click.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-details-title"
        className="relative flex h-[96dvh] max-h-[96dvh] min-h-0 w-full max-w-[1040px] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0E1C23] text-[#F5F0DE] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] sm:h-auto sm:max-h-[calc(100dvh-7rem)] sm:rounded-2xl"
      >
        {/* Accent glow line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />

        {/* Fixed header */}
        <header className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0E1C23]/95 px-4 py-2.5 backdrop-blur sm:px-7">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: accent,
                boxShadow: `0 0 10px ${accent}`,
              }}
            />
            <span
              className="rounded-full border px-3 py-1 text-[9px] uppercase tracking-[0.15em] [font-family:var(--font-pixel)]"
              style={{
                color: accent,
                borderColor: `${accent}55`,
                backgroundColor: `${accent}14`,
              }}
            >
              {category}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close event details"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl leading-none text-white/75 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#55DFFF]"
          >
            ×
          </button>
        </header>

        {/* Scrollable content */}
        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          className="min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain [scrollbar-color:rgba(85,223,255,0.35)_transparent] [scrollbar-width:thin]"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          <div className="p-4 sm:p-7 lg:p-9">
            {/* Top: poster + title/description */}
            <div className="grid min-w-0 grid-cols-1 items-start gap-6 min-[640px]:grid-cols-[200px_minmax(0,1fr)] min-[640px]:gap-7 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
              {/* Poster (compact, uncropped) */}
              <div className="mx-auto w-full max-w-[220px] min-[640px]:mx-0 min-[640px]:max-w-none">
                <div
                  className="overflow-hidden rounded-xl border bg-[#09151B] p-1.5 shadow-xl shadow-black/30"
                  style={{ borderColor: `${accent}40` }}
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={`${event.title} event artwork`}
                      loading="lazy"
                      className="block h-auto max-h-[44dvh] w-full rounded-lg object-contain min-[640px]:max-h-[52dvh]"
                    />
                  ) : (
                    <div
                      className="flex aspect-[3/4] items-center justify-center rounded-lg p-5"
                      style={{
                        background: `linear-gradient(160deg, ${accent}22, transparent 70%)`,
                      }}
                    >
                      <span className="text-center text-xl leading-tight [font-family:var(--font-gotham-bold)]">
                        {event.title}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title + description */}
              <div className="min-w-0">
                <p
                  className="mb-3 text-[9px] uppercase tracking-[0.18em] [font-family:var(--font-pixel)]"
                  style={{ color: accent }}
                >
                  Event overview
                </p>

                <h2
                  id="event-details-title"
                  className="break-words text-[clamp(1.6rem,3.6vw,2.7rem)] leading-[1.08] tracking-[-0.03em] [font-family:var(--font-gotham-bold)]"
                >
                  {event.title}
                </h2>

                <div
                  aria-hidden="true"
                  className="mt-4 h-[3px] w-14 rounded-full"
                  style={{ backgroundColor: accent }}
                />

                <p className="mt-5 max-w-[68ch] whitespace-pre-line break-words text-[13px] leading-[1.85] text-[#F5F0DE]/75 sm:text-[14px]">
                  {event.description ||
                    event.shortDescription ||
                    "More information about this event will be announced soon."}
                </p>
              </div>
            </div>

            {/* Info cards */}
            <dl className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 min-[640px]:grid-cols-3">
              {details.map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 transition-colors hover:border-white/20 hover:bg-white/[0.05] sm:p-4"
                >
                  <dt
                    className="flex items-center gap-2 text-[9px] uppercase tracking-[0.12em] [font-family:var(--font-pixel)]"
                    style={{ color: accent }}
                  >
                    <Icon name={label} />
                    {label}
                  </dt>

                  <dd className="mt-2.5 break-words text-[13px] leading-snug [overflow-wrap:anywhere] sm:text-[14px]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Rules */}
            <div className="mt-8 rounded-xl border border-white/10 bg-[#09151B]/70 p-4 sm:p-6">
              <p
                className="mb-2 text-[9px] uppercase tracking-[0.18em] [font-family:var(--font-pixel)]"
                style={{ color: accent }}
              >
                Important information
              </p>

              <h3 className="text-base sm:text-lg [font-family:var(--font-gotham-bold)]">
                Before you register
              </h3>

              {rules.length > 0 ? (
                <ol className="mt-4 space-y-3">
                  {rules.map((rule, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-[12.5px] leading-[1.75] text-[#F5F0DE]/75 sm:text-[13.5px]"
                    >
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-[#09151B]"
                        style={{ backgroundColor: accent }}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 break-words">{rule}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-[12.5px] leading-[1.8] text-[#F5F0DE]/65 sm:text-[13.5px]">
                  Participation rules and eligibility details will be announced
                  by the organizers at {event.venue || "the event desk"}.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Fixed registration footer */}
        <footer className="z-20 shrink-0 border-t border-white/10 bg-[#0E1C23]/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-7 sm:py-4">
          <div className="flex flex-col-reverse items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="hidden text-[12px] text-[#F5F0DE]/60 sm:block">
              <span className="text-[#F5F0DE]">{formatFee(event)}</span>
              <span className="mx-2 text-white/20">•</span>
              {formatTeamSize(event)}
            </p>

            <Link
              href={`/events/${event.slug || event.id}`}
              onClick={onClose}
              className="group flex min-h-12 items-center justify-center gap-3 rounded-lg px-6 py-3 text-sm text-[#09151B] shadow-lg transition-all [font-family:var(--font-gotham-bold)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 sm:min-w-[260px]"
              style={{
                backgroundColor: accent,
                boxShadow: `0 10px 28px -12px ${accent}80`,
                outlineColor: accent,
              }}
            >
              Register on TechXetra
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        </footer>
      </section>
    </div>
  );
}