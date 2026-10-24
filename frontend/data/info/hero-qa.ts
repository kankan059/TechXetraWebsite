export type HeroQuestion = {
  id: string;
  question: string;
  answer: string;
  category?: string;
  order?: number;
};

export const heroQuestions: HeroQuestion[] = [
  {
    id: "what-is-techxetra",
    question: "What is TechXetra?",
    answer:
      "TechXetra is a college festival celebrating technology, creativity, competition and culture.",
    category: "ABOUT",
    order: 1,
  },
  {
    id: "who-can-participate",
    question: "Who can participate?",
    answer:
      "Eligibility details will be announced soon. Check each event page for its latest participation requirements.",
    category: "ENTRY",
    order: 2,
  },
  {
    id: "how-to-register",
    question: "How do I register?",
    answer:
      "Explore the events directory, choose an event and follow its registration flow. Registration requirements may vary by event.",
    category: "START",
    order: 3,
  },
  {
    id: "what-events-are-available",
    question: "What events can I join?",
    answer:
      "The festival includes technical challenges, cultural contests, gaming, sports, workshops and other experiences.",
    category: "DISCOVER",
    order: 4,
  },
  {
    id: "where-is-the-event",
    question: "Where will it take place?",
    answer:
      "Venue and schedule details will be announced soon. Event pages will carry the latest confirmed information.",
    category: "DETAILS",
    order: 5,
  },
  {
    id: "is-there-a-fee",
    question: "Is there a registration fee?",
    answer:
      "Fees depend on the event. Pricing and any applicable pass requirements will be shown on the relevant event page.",
    category: "COST",
    order: 6,
  },
];
