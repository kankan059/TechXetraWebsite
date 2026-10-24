"use client";

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

export default function EventDetailsModal({
  event,
  onClose,
}: EventDetailsModalProps) {
  const metadata = getMetadata(event);
  const category = event.category.replaceAll("_", " ");
  const accent = getCategoryColor(event.category);
  const image = metadata.image || metadata.image_url || metadata.poster;
  const rules =
    metadata.rules?.length
      ? metadata.rules
      : typeof event.rules === "string"
        ? event.rules.split("\n").map((rule) => rule.trim()).filter(Boolean)
        : Array.isArray(event.rules)
          ? event.rules
          : [];

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm min-[640px]:items-center min-[640px]:p-6"
      onMouseDown={(click) => {
        if (click.target === click.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-details-title"
        className="flex max-h-[88dvh] w-full max-w-[820px] flex-col overflow-y-auto rounded-t-2xl border border-white/15 bg-[#101F26] text-[#F5F0DE] min-[640px]:max-h-[84dvh] min-[640px]:rounded-xl"
      >
        <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#101F26] px-5 py-2 min-[640px]:px-7">
          <span
            className="text-[9px] uppercase tracking-[0.15em] [font-family:var(--font-pixel)]"
            style={{ color: accent }}
          >
            {category}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close event details"
            className="flex h-11 w-11 items-center justify-center text-2xl focus-visible:outline-2 focus-visible:outline-[#55DFFF]"
          >
            ×
          </button>
        </header>

        <div className="p-5 min-[640px]:p-6">
          <div className="grid items-start gap-5 min-[760px]:grid-cols-[1fr_0.82fr]">
            <div>
              <h2
                id="event-details-title"
                className="break-words text-[clamp(1.7rem,3.4vw,2.5rem)] leading-[1.08] tracking-[-0.035em] [font-family:var(--font-gotham-bold)]"
              >
                {event.title}
              </h2>
              <p className="mt-4 whitespace-pre-line break-words text-[13px] leading-[1.65] text-[#F5F0DE]/75">
                {event.description ||
                  event.shortDescription ||
                  "More information about this event will be announced soon."}
              </p>
            </div>

            <div className="overflow-hidden rounded-lg">
              {image ? (
                <div className="relative aspect-[16/10]">
                  <img
                    src={image}
                    alt={`${event.title} event artwork`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center bg-[#15313B] p-6">
                  <span className="text-center text-2xl [font-family:var(--font-gotham-bold)]">
                    {event.title}
                  </span>
                </div>
              )}
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 border-y border-white/10 py-5 min-[640px]:grid-cols-3">
            {[
              ["Date", formatDate(event.starts_at, event.festDay || event.day_of_event)],
              ["Time", formatTime(event.starts_at)],
              ["Venue", event.venue || "To be announced"],
              ["Team size", formatTeamSize(event)],
              ["Entry fee", formatFee(event)],
              ["Prize", formatPrize(event, metadata)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt
                  className="text-[9px] uppercase tracking-[0.12em] [font-family:var(--font-pixel)]"
                  style={{ color: accent }}
                >
                  {label}
                </dt>
                <dd className="mt-1.5 break-words text-[12px] leading-relaxed [overflow-wrap:anywhere]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <h3 className="text-[14px] [font-family:var(--font-gotham-bold)]">
              Before you register
            </h3>
            {rules.length > 0 ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[12px] leading-[1.65] text-[#F5F0DE]/75">
                {rules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12px] leading-[1.65] text-[#F5F0DE]/65">
                Participation rules and eligibility details will be announced by the organizers at{" "}
                {event.venue || "the event desk"}.
              </p>
            )}
          </div>
        </div>

        <footer className="sticky bottom-0 z-10 mt-auto shrink-0 border-t border-white/15 bg-[#101F26] px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 min-[640px]:px-7">
          <Link
            href={`/events/${event.slug || event.id}`}
            onClick={onClose}
            className="flex min-h-12 items-center justify-center gap-5 bg-[#55DFFF] px-5 py-3 text-sm text-[#09151B] [font-family:var(--font-gotham-bold)] transition-colors hover:bg-[#8BEAFF] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#55DFFF]"
          >
            Register on TechXetra
            <span aria-hidden="true">→</span>
          </Link>
        </footer>
      </section>
    </div>
  );
}
