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
      "TechXetra is the annual techno-cultural fest organized by the School of Engineering, Tezpur University. Held since 2008, it celebrates technology, creativity, competition and culture through technical events, interactive events and recreational events.",
    category: "ABOUT",
    order: 1,
  },
  {
    id: "who-can-participate",
    question: "Who can participate?",
    answer:
      "TechXetra is open to students from Tezpur University as well as students from other institutions. Eligibility and team size may vary by event, so please check the event's page for details.",
    category: "ENTRY",
    order: 2,
  },
  {
    id: "how-to-register",
    question: "How do I register?",
    answer:
      "Go to the Events directory, find the event you want to join and follow its registration process. Registration requirements may vary by event.",
    category: "START",
    order: 3,
  },
  {
    id: "what-events-can-i-join",
    question: "What events can I join?",
    answer:
      "You can join any event. Please check each event's eligibility criteria before registering. Visit the Events directory for event details; more events will be announced soon.",
    category: "DETAILS",
    order: 5,
  },
  {
    id: "where-will-it-take-place",
    question: "Where will it take place?",
    answer:
      "TechXetra will be held at Tezpur University. The exact venue within the university will be announced soon.",
    category: "COST",
    order: 6,
  },
  {
    id: "is-there-a-registration-fee",
    question: "Is there a registration fee?",
    answer:
      "Registration fees are charged according to the event you register for. The exact fee is shown on the event's registration page.",
    category: "COST",
    order: 6,
  },
];
