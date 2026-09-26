export type EventTheme = {
  id: string;
  index: string;
  name: string;
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
    name: "TECHNICAL",
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
    id: "non-technical",
    index: "02",
    name: "NON TECHNICAL",
    subtitle: "Your stage. Your moment.",
    description:
      "Bring your music, creativity and stage presence to TechXetra.\n\nTake part in performances and competitions that bring different talents together.",
    accent: "#FFB2A6",
    accentSoft: "#852533",
    background: "#430F19",
    foreground: "#F5F0DE",
    image: "/gallary/image2.png",
    href: "/events/non-technical",
  },
  {
    id: "esports",
    index: "03",
    name: "E SPORTS",
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
];