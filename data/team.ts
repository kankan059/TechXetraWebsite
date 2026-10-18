export type TeamMember = {
  name: string;
  role: string;
  image: string;
  phone?: string;
  email?: string;
};

export type TeamGroup = {
  title: string;
  description: string;
  members: TeamMember[];
  showContact: boolean;
};

export const teamGroups: TeamGroup[] = [
  {
    title: "Core Members",
    description: "The leadership behind TechXetra",
    showContact: true,
    members: [
      {
        name: "Rishika ",
        role: "Coordinator",
        image: "https://plus.unsplash.com/premium_photo-1791899716302-19784a62a0e2?q=80&w=715&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
        phone: "6003963538",
        email: "kankanray059@gmail.com",
      },
      {
        name: "Aarohi Borah",
        role: "Cultural Head",
        image: "https://images.unsplash.com/photo-1789291869251-ace4ca52bb9c?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
        phone: "",
        email: "",
      },
      {
        name: "Ritupan Saikia",
        role: "Technical Head",
        image: "/images/team/ritupan-saikia.webp",
        phone: "",
        email: "",
      },
    ],
  },

  {
    title: "Ancillary Committee Leads",
    description: "The people coordinating our committees",
    showContact: false,
    members: [
      {
        name: "Ananya Hazarika",
        role: "Registration Lead",
        image: "/images/team/ananya-hazarika.webp",
      },
      {
        name: "Parthajit Dutta",
        role: "Logistics Lead",
        image: "/images/team/parthajit-dutta.webp",
      },
      {
        name: "Nandita Gogoi",
        role: "Publicity Lead",
        image: "/images/team/nandita-gogoi.webp",
      },
    ],
  },

  {
    title: "Webmaster Team",
    description: "Building the digital experience of TechXetra",
    showContact: false,
    members: [
      {
        name: "Kankan Ray",
        role: "Webmaster",
        image: "/images/team/kankan-ray.webp",
      },
      {
        name: "Member Two",
        role: "Web Developer",
        image: "/images/team/webmaster-2.webp",
      },
      {
        name: "Member Three",
        role: "Web Developer",
        image: "/images/team/webmaster-3.webp",
      },
    ],
  },

  {
    title: "Design Team",
    description: "The creative minds behind TechXetra",
    showContact: false,
    members: [
      {
        name: "Mousumi Das",
        role: "Designer",
        image: "/images/team/mousumi-das.webp",
      },
      {
        name: "Member Two",
        role: "Graphic Designer",
        image: "/images/team/design-2.webp",
      },
      {
        name: "Member Three",
        role: "Graphic Designer",
        image: "/images/team/design-3.webp",
      },
    ],
  },
];