export type Sponsor = {
  name: string;
  description: string;
  image: string;
  tier: string;
};

export const sponsors: Sponsor[] = [
  {
    tier: "Title Sponsor",
    name: "Your Brand Here",
    description:
      "Be part of an experience that brings technology, creativity and people together.",
    image:
      "https://images.unsplash.com/photo-1620288627223-53302f4e8c74?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  },
  {
    tier: "Platinum Partners",
    name: "Built for What's Next",
    description:
      "Supporting new ideas, ambitious minds and the future of technology.",
    image:
      "https://images.unsplash.com/photo-1783630208950-973c0dc3d51f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  },
  {
    tier: "Gold Partners",
    name: "Powering Possibilities",
    description:
      "Connecting brands with the next generation of creators and innovators.",
    image: "https://images.unsplash.com/photo-1602934445884-da0fa1c9d3b3?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
  },
  {
    tier: "Community Partners",
    name: "Better Together",
    description:
      "Celebrating the people and communities that help ideas grow.",
    image: "https://images.unsplash.com/photo-1601158935942-52255782d322?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
  },
];