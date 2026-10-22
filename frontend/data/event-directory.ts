export const CATEGORIES: { label: string; value: string }[] = [
  { label: "All categories", value: "ALL" },
  { label: "Technical", value: "TECHNICAL" },
  { label: "Cultural", value: "CULTURAL" },
  { label: "E-Sports", value: "E_SPORTS" },
  { label: "Interactive", value: "INTERACTIVE" },
  { label: "Recreational", value: "RECREATIONAL" },
  { label: "Showcase", value: "SHOWCASE" },
  { label: "Sports", value: "SPORTS" },
  { label: "Management", value: "MANAGEMENT" },
  { label: "Literary", value: "LITERARY" },
  { label: "Workshops", value: "WORKSHOP" },
  { label: "Other", value: "OTHER" },
];

export const DAY_FILTERS = [
  { label: "All days", value: "ALL" },
  { label: "Day 01", value: "1" },
  { label: "Day 02", value: "2" },
  { label: "Day 03", value: "3" },
];

export const TEAM_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Solo", value: "SOLO" },
  { label: "Team", value: "TEAM" },
] as const;

export const DIRECTORY_COPY = {
  passEyebrow: "Festival access",
  passTitle: "Gate pass",
  passDescription:
    "General entry to the festival grounds, tech exhibitions, arenas and cultural night pro-shows across the festival dates.",
  passPriceLabel: "Pass pricing",
  passButton: "Reserve pass",
  eyebrow: "Discover / Participate / Compete",
  title: "Events directory",
  description:
    "Explore technical challenges, cultural contests, gaming tournaments, sports and workshops across TechXetra.",
  leaderboardLink: "Tournament leaderboards",
} as const;
