export type EventCategory = "TECHNICAL" | "NON_TECHNICAL" | "E_SPORTS";

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  category: EventCategory;
  themeColor: "#0972AE" | "#8F1418" | "#3F622D";
  dates: string;
  teamSize: string;
  duration: string;
  prizePool: string;
  venue: string;
  registrationUrl: string;
  description: string;
  rules: string[];
  posterPath?: string;
  zodiacSign?: string;
}