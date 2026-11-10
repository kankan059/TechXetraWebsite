export type EventTheme = {
  id: string;
  index: string;
  name: string;
  categoryLabel: string;
  tagline: string;
  subtitle: string;
  description: string;
  accent: string;
  accentSoft: string;
  background: string;
  foreground: string;
  image?: string;
  href?: string;
};

export const events: EventTheme[] = [
  {
    id: "technical",
    index: "01",
    name: "CITADEL",
    categoryLabel: "Technical Events",
    tagline: "The fortress of technical minds. Build, code, compete.",
    subtitle: "Ideas become something real.",
    description:
      "Build, code and solve problems with people who enjoy making things.\n\nFrom software challenges to engineering competitions, explore the technical side of TechXetra.",
    accent: "#8DDCFA",
    accentSoft: "#185D7C",
    background: "#092C40",
    foreground: "#F5F0DE",
    image: "/gallary/image1.png",
    href: "/events/technical",
  },
  {
    id: "interactive",
    index: "02",
    name: "ACROPOLIS",
    categoryLabel: "Interactive Events",
    tagline: "The summit of interactive events, where ideas meet and minds clash.",
    subtitle: "Think fast. Take part.",
    description:
      "Step into challenges that bring people together through ideas, quick thinking and interaction.\n\nTest your instincts, collaborate with others and take on experiences designed to keep you involved.",
    accent: "#F2C58B",
    accentSoft: "#76502D",
    background: "#352516",
    foreground: "#F5F0DE",
    href: "/events/interactive",
  },
  {
    id: "recreational",
    index: "03",
    name: "MAELSTROM",
    categoryLabel: "Recreational Events",
    tagline: "The whirlwind of recreational events. Play hard, get swept away.",
    subtitle: "Take a break. Join the play.",
    description:
      "Bring your energy to the lighter side of TechXetra.\n\nEnjoy recreational challenges, have fun with fellow participants and make every moment count.",
    accent: "#D7C4FF",
    accentSoft: "#59447D",
    background: "#251D38",
    foreground: "#F5F0DE",
    href: "/events/recreational",
  },
  {
    id: "cultural",
    index: "04",
    name: "HALCYON",
    categoryLabel: "Cultural Events",
    tagline: "The stage of cultural events, where art, music and rhythm come alive.",
    subtitle: "Your stage. Your moment.",
    description:
      "Bring your music, creativity and stage presence to TechXetra.\n\nTake part in performances and competitions that bring different talents together.",
    accent: "#FFB2A6",
    accentSoft: "#852533",
    background: "#430F19",
    foreground: "#F5F0DE",
    image: "/gallary/image2.png",
    href: "/events/cultural",
  },
  {
    id: "esports",
    index: "05",
    name: "DECOLOSSEUM",
    categoryLabel: "Esports",
    tagline: "The arena of esports. Enter to compete, leave a legend.",
    subtitle: "One team. Every move counts.",
    description:
      "Bring your squad and put your teamwork to the test.\n\nStay focused, make every round count and compete in the gaming events at TechXetra.",
    accent: "#CAEBA7",
    accentSoft: "#3D6630",
    background: "#18351C",
    foreground: "#F5F0DE",
    image: "/gallary/image3.png",
    href: "/events/esports",
  },
  {
    id: "robotics",
    index: "06",
    name: "ROBOPHRONESIS",
    categoryLabel: "Robotics Events",
    tagline: "The proving ground of robotic minds, where machines are built to think, move and battle.",
    subtitle: "Design. Build. Bring it to life.",
    description:
      "Explore the world of robotics through building, engineering and machine-driven challenges.\n\nPut your ideas into motion and test what your creations can do.",
    accent: "#A8E5D0",
    accentSoft: "#286454",
    background: "#102D28",
    foreground: "#F5F0DE",
    href: "/events/robotics",
  },
];
