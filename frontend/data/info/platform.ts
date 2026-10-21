export type PlatformPortal = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  accent: string;
  number: string;
  status: string;
};

export const platformPortals: PlatformPortal[] = [
  {
    id: "gate-pass",
    eyebrow: "ACCESS",
    title: "Festival Gate Pass",
    description:
      "Your entry point to TechXetra 2026. Get your pass and prepare for the experience.",
    href: "/checkout",
    accent: "#53d8ff",
    number: "01",
    status: "OPEN ACCESS",
  },
  {
    id: "events",
    eyebrow: "DISCOVER",
    title: "Events & Competitions",
    description:
      "Explore technical events, challenges, competitions and everything happening at the festival.",
    href: "/events?view=directory",
    accent: "#b5a0ff",
    number: "02",
    status: "EXPLORE",
  },
  {
    id: "teams",
    eyebrow: "COLLABORATE",
    title: "Teams & Squads",
    description:
      "Find your squad, manage your team and get ready to compete together.",
    href: "/teams",
    accent: "#70caff",
    number: "03",
    status: "TEAM HUB",
  },
  {
    id: "leaderboards",
    eyebrow: "COMPETE",
    title: "Public Leaderboards",
    description:
      "Follow the rankings, track performance and see who is leading the competition.",
    href: "/leaderboards",
    accent: "#ffcb70",
    number: "04",
    status: "LIVE RANKINGS",
  },
  {
    id: "staff",
    eyebrow: "OPERATIONS",
    title: "Staff Scanner & Console",
    description:
      "Tools for event staff to verify registrations and manage on-ground operations.",
    href: "/staff",
    accent: "#81e6c0",
    number: "05",
    status: "STAFF ACCESS",
  },
  {
    id: "admin",
    eyebrow: "CONTROL SYSTEM",
    title: "Admin & Testing Suite",
    description:
      "Access administration tools and testing environments for the platform.",
    href: "/admin",
    accent: "#ff8585",
    number: "06",
    status: "RESTRICTED",
  },
];