export type TechnicalEvent = {
  id: string;
  name: string;
  category: string;
  summary: string;
  description: string[];
  image: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  teamSize: string | null;
  fee: string | null;
  prize: string | null;
  rules: string[];
  registrationUrl: string | null;
};

export const technicalEvents: TechnicalEvent[] = [
  {
    id: "hackathon",
    name: "Hackathon",
    category: "Development",
    summary: "Work together, solve a problem and build something that works.",
    description: [
      "A team competition focused on building a working solution to a given problem.",
      "The final problem statement, format and judging criteria will be added here.",
    ],
    image: "",
    date: null,
    time: null,
    venue: null,
    teamSize: null,
    fee: null,
    prize: null,
    rules: [],
    registrationUrl: null,
  },
  {
    id: "coding",
    name: "Coding Challenge",
    category: "Programming",
    summary: "Put your logic, speed and problem solving skills to the test.",
    description: [
      "A programming competition built around solving problems within a set time.",
      "Supported languages, contest format and scoring details will be added here.",
    ],
    image: "",
    date: null,
    time: null,
    venue: null,
    teamSize: null,
    fee: null,
    prize: null,
    rules: [],
    registrationUrl: null,
  },
  {
    id: "robotics",
    name: "Robotics",
    category: "Engineering",
    summary: "Build, test and bring your machine into the competition.",
    description: [
      "An engineering competition focused on building and controlling a robot.",
      "Arena details, equipment limits and competition rules will be added here.",
    ],
    image: "",
    date: null,
    time: null,
    venue: null,
    teamSize: null,
    fee: null,
    prize: null,
    rules: [],
    registrationUrl: null,
  },
];