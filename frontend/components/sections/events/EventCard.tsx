
"use client";

import Image from "next/image";
import type { EventItem } from "@/types/api";

type EventMetadata = {
  image?: string;
  image_url?: string;
  poster?: string;
  summary?: string;
};

type EventCardProps = {
  event: EventItem;
  index?: number;
  onSelect: (event: EventItem, trigger: HTMLButtonElement) => void;
};

function getMetadata(event: EventItem): EventMetadata {
  try {
    return event.metadata ? JSON.parse(event.metadata) : {};
  } catch {
    return {};
  }
}

function getCategoryTone(category: string) {
  const normalized = (category || "")
    .toUpperCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  if (
    normalized.includes("ESPORT") ||
    normalized.includes("E_SPORT")
  ) {
    return {
      accent: "#8FE388",
      poster: "#1D3027",
      border: "hover:border-[#8FE388]/40",
    };
  }

  if (normalized === "TECHNICAL") {
    return {
      accent: "#55DFFF",
      poster: "#102B38",
      border: "hover:border-[#55DFFF]/40",
    };
  }

  if (normalized === "INTERACTIVE") {
    return {
      accent: "#FBBF24",
      poster: "#282315",
      border: "hover:border-amber-400/40",
    };
  }

  if (normalized === "RECREATIONAL") {
    return {
      accent: "#2DD4BF",
      poster: "#132824",
      border: "hover:border-teal-400/40",
    };
  }

  if (normalized === "SHOWCASE") {
    return {
      accent: "#C084FC",
      poster: "#24182E",
      border: "hover:border-purple-400/40",
    };
  }

  if (normalized === "CULTURAL") {
    return {
      accent: "#FB7185",
      poster: "#301B22",
      border: "hover:border-rose-400/40",
    };
  }

  return {
    accent: "#FF806E",
    poster: "#382321",
    border: "hover:border-[#FF806E]/40",
  };
}

function getParticipation(event: EventItem) {
  const isTeam = event.is_team_event ?? event.isTeamEvent ?? event.isTeam;
  if (!isTeam) return "Individual";

  const min = event.min_team_size ?? event.minTeamSize;
  const max = event.max_team_size ?? event.maxTeamSize;

  if (min != null && max != null && min === max) {
    return `Team · ${min} members`;
  }

  if (min != null && max != null) {
    return `Team · ${min}–${max} members`;
  }

  if (max != null) return `Team · Up to ${max} members`;
  if (min != null) return `Team · Min. ${min} members`;

  return "Team event";
}

function getEntryFee(event: EventItem) {
  const priceModel = event.price_model ?? event.priceModel ?? "FREE";
  const price = event.price_paise ?? event.pricePaise ?? 0;

  if (priceModel === "FREE" || price === 0) {
    return { amount: "FREE", unit: "" };
  }

  if (typeof price !== "number" || !Number.isFinite(price)) {
    return { amount: "To be announced", unit: "" };
  }

  const amount = `₹${(price / 100).toLocaleString("en-IN")}`;

  if (priceModel === "PER_TEAM") {
    return { amount, unit: "/ team" };
  }

  return { amount, unit: "/ person" };
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function EventCard({
  event,
  index = 0,
  onSelect,
}: EventCardProps) {
  const metadata = getMetadata(event);
  const image = metadata.image || metadata.image_url || metadata.poster;
  const tone = getCategoryTone(event.category);

  const categoryLabel = event.category
    .replaceAll("_", " ")
    .replaceAll("-", " ");

  const fee = getEntryFee(event);

  return (
    <article
      data-event-card
      className={`group relative flex min-w-0 flex-col overflow-hidden border border-white/10 bg-[#101F26] transition-colors duration-300 ${tone.border}`}
      style={{
        clipPath:
          "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))",
      }}
    >
      <button
        type="button"
        onClick={(click) => onSelect(event, click.currentTarget)}
        aria-label={`View ${event.title} details`}
        className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#55DFFF]"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-[#101F26]">
          {image ? (
            <Image
              src={image}
              alt={`${event.title} event artwork`}
              fill
              priority={index < 3}
              sizes="(min-width: 1100px) 400px, (min-width: 640px) 46vw, 92vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col justify-between p-6 min-[900px]:p-7"
              style={{ backgroundColor: tone.poster }}
            >
              <span className="text-[8px] tracking-[0.18em] text-[#F5F0DE]/55 [font-family:var(--font-pixel)]">
                TECHXETRA 2026
              </span>

              <span className="max-w-[12ch] text-[clamp(1.8rem,3vw,2.7rem)] leading-[1.05] tracking-[-0.035em] text-[#F5F0DE] [font-family:var(--font-gotham-bold)]">
                {event.title}
              </span>

              <span
                className="text-[9px] uppercase tracking-[0.14em]"
                style={{ color: tone.accent }}
              >
                {categoryLabel}
              </span>
            </div>
          )}
        </div>
      </button>

      <div className="flex flex-1 flex-col p-5 min-[900px]:p-6">
        <p
          className="text-[9px] uppercase tracking-[0.14em] [font-family:var(--font-pixel)]"
          style={{ color: tone.accent }}
        >
          {categoryLabel}
        </p>

        <h2 className="mt-3 text-[22px] leading-tight tracking-[-0.025em] [font-family:var(--font-gotham-bold)]">
          {event.title}
        </h2>

        <p className="mt-3 line-clamp-3 text-[13px] leading-[1.8] text-[#F5F0DE]/70">
          {metadata.summary ||
            event.description ||
            event.shortDescription ||
            "Event details will be announced soon."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4 border-y border-white/10 py-4">
          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-[0.12em] text-[#F5F0DE]/45 [font-family:var(--font-pixel)]">
              Participation
            </p>

            <p className="mt-2 break-words text-[12px] leading-relaxed text-[#F5F0DE]/90">
              {getParticipation(event)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-[0.12em] text-[#F5F0DE]/45 [font-family:var(--font-pixel)]">
              Entry fee
            </p>

            <div
              className="mt-2 flex flex-wrap items-baseline gap-x-1 gap-y-1 text-[12px] leading-relaxed [font-family:var(--font-gotham-bold)]"
              style={{ color: tone.accent }}
            >
              <span className="break-words">{fee.amount}</span>

              {fee.unit && (
                <span className="whitespace-nowrap text-[10px]">
                  {fee.unit}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={(click) => onSelect(event, click.currentTarget)}
            className="flex min-h-12 w-full items-center justify-between gap-4 border-t border-white/15 pt-4 text-xs [font-family:var(--font-gotham-bold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#55DFFF]"
          >
            <span>View event</span>
            <ArrowIcon />
          </button>
        </div>
      </div>
    </article>
  );
}
