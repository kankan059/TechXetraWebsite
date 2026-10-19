
export type ScheduleEvent = {
  id: string;
  time: string;
  endTime: string;
  title: string;
  description: string;
  venue: string;
  category: string;
};

export type ScheduleDay = {
  id: string;
  label: string;
  date: string;
  theme: string;
  events: ScheduleEvent[];
};

export const schedule: ScheduleDay[] = [
  {
    id: "day-1",
    label: "Day One",
    date: "20 NOV 2026",
    theme: "The Beginning",
    events: [
      {
        id: "opening",
        time: "09:00 AM",
        endTime: "10:00 AM",
        title: "Opening Ceremony",
        description:
          "Begin TechXetra with the inauguration and welcome address.",
        venue: "Main Auditorium",
        category: "Ceremony",
      },
      {
        id: "keynote",
        time: "10:15 AM",
        endTime: "11:15 AM",
        title: "Future of Technology",
        description:
          "Explore emerging technologies and the ideas shaping tomorrow.",
        venue: "Conference Hall",
        category: "Keynote",
      },
      {
        id: "web-workshop",
        time: "11:30 AM",
        endTime: "01:00 PM",
        title: "Web Development Workshop",
        description:
          "Build your understanding of modern web technologies through hands-on learning.",
        venue: "Computer Lab",
        category: "Workshop",
      },
      {
        id: "lunch-1",
        time: "01:00 PM",
        endTime: "02:00 PM",
        title: "Lunch Break",
        description:
          "Take a break and connect with fellow participants.",
        venue: "Dining Area",
        category: "Break",
      },
      {
        id: "ideathon",
        time: "02:00 PM",
        endTime: "04:30 PM",
        title: "Innovation Challenge",
        description:
          "Collaborate with your team and turn a creative idea into a practical solution.",
        venue: "Innovation Lab",
        category: "Competition",
      },
    ],
  },
  {
    id: "day-2",
    label: "Day Two",
    date: "21 NOV 2026",
    theme: "Create & Compete",
    events: [
      {
        id: "check-in",
        time: "09:00 AM",
        endTime: "09:30 AM",
        title: "Participant Check-in",
        description:
          "Complete participant verification and prepare for the day's activities.",
        venue: "Registration Desk",
        category: "Registration",
      },
      {
        id: "hackathon",
        time: "09:30 AM",
        endTime: "12:30 PM",
        title: "Hackathon",
        description:
          "Work together to develop a prototype and present your technical creativity.",
        venue: "Innovation Lab",
        category: "Competition",
      },
      {
        id: "ai-session",
        time: "12:30 PM",
        endTime: "01:00 PM",
        title: "AI & Machine Learning",
        description:
          "Discover practical applications of artificial intelligence and machine learning.",
        venue: "Seminar Hall",
        category: "Technical Talk",
      },
      {
        id: "lunch-2",
        time: "01:00 PM",
        endTime: "02:00 PM",
        title: "Lunch Break",
        description:
          "Recharge before the afternoon sessions begin.",
        venue: "Dining Area",
        category: "Break",
      },
      {
        id: "robotics",
        time: "02:00 PM",
        endTime: "04:30 PM",
        title: "Robotics Showcase",
        description:
          "Explore creative robotic builds, prototypes and live demonstrations.",
        venue: "Exhibition Area",
        category: "Exhibition",
      },
    ],
  },
  {
    id: "day-3",
    label: "Day Three",
    date: "22 NOV 2026",
    theme: "The Grand Finale",
    events: [
      {
        id: "exhibition",
        time: "09:30 AM",
        endTime: "11:00 AM",
        title: "Project Exhibition",
        description:
          "Discover projects and prototypes developed by participating teams.",
        venue: "Exhibition Hall",
        category: "Exhibition",
      },
      {
        id: "evaluation",
        time: "11:00 AM",
        endTime: "12:30 PM",
        title: "Final Evaluation",
        description:
          "Teams present their solutions for evaluation by the judges.",
        venue: "Main Auditorium",
        category: "Evaluation",
      },
      {
        id: "lunch-3",
        time: "12:30 PM",
        endTime: "01:30 PM",
        title: "Lunch Break",
        description:
          "Connect with participants before the closing ceremony.",
        venue: "Dining Area",
        category: "Break",
      },
      {
        id: "awards",
        time: "02:00 PM",
        endTime: "03:00 PM",
        title: "Awards & Recognition",
        description:
          "Celebrate outstanding projects, teamwork and innovation.",
        venue: "Main Auditorium",
        category: "Awards",
      },
      {
        id: "closing",
        time: "03:00 PM",
        endTime: "04:00 PM",
        title: "Closing Ceremony",
        description:
          "Conclude TechXetra with a celebration of three days of innovation and collaboration.",
        venue: "Main Auditorium",
        category: "Ceremony",
      },
    ],
  },
];
