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

// The brochure gives session placement, but no exact clock times or venues.
const createEvent = (
  id: string,
  title: string,
  description: string,
  category: string,
): ScheduleEvent => ({
  id,
  time: "TBA",
  endTime: "TBA",
  title,
  description,
  venue: "TBA",
  category,
});

export const schedule: ScheduleDay[] = [
  {
    id: "day-1",
    label: "Day One",
    date: "29 JAN 2027",
    theme: "The Beginning",
    events: [
      createEvent("northrun", "NORTHRUN", "A long-distance run to kick off TechXetra 2027.", "Recreational"),
      createEvent("inaugural-ceremony", "Inaugural Ceremony", "The opening ceremony of TechXetra 2027.", "Ceremony"),
      createEvent("army-exhibition", "Army Exhibition", "An exhibition by the Indian Army.", "Exhibition"),
      createEvent("algo-maze", "Algo Maze", "A robotics challenge focused on algorithmic maze solving.", "Technical"),
      createEvent("robo-drift", "Robo Drift", "A high-speed robotics challenge where engineering meets racing.", "Technical"),
      createEvent("robo-soccer", "Robo Soccer", "A robotic soccer competition.", "Technical"),
      createEvent("frontend-frenzy", "Frontend Frenzy", "A frontend development competition testing design and implementation skills.", "Technical"),
      createEvent("techxibition-school-junior", "TechXibition (School Level 5–8)", "A technology exhibition for school students of classes 5–8.", "Exhibition"),
      createEvent("hackxetra", "HackXetra", "A hackathon where teams build solutions to real-world challenges.", "Hackathon"),
      createEvent("kinematic-model", "Kinematic Model", "Design, build and demonstrate a working mechanism.", "Technical"),
      createEvent("ideathon", "Ideathon", "Develop and pitch inJANative, scalable ideas.", "Technical"),
      createEvent("upcycle", "UP:CYCLE", "A waste-management pitch focused on turning waste into sustainable ideas.", "Technical"),
      createEvent("mob-showdown", "MOB SHOWDOWN", "A featured event in the Day 1 afternoon session.", "Competition"),
    ],
  },
  {
    id: "day-2",
    label: "Day Two",
    date: "30 JAN 2027",
    theme: "Create & Compete",
    events: [
      createEvent("algo-maze", "Algo Maze", "A robotics challenge focused on algorithmic maze solving.", "Technical"),
      createEvent("robo-drift", "Robo Drift", "A high-speed robotics challenge where engineering meets racing.", "Technical"),
      createEvent("robo-soccer", "Robo Soccer", "A robotic soccer competition.", "Technical"),
      createEvent("techxibition-school-senior", "TechXibition (School Level 9–12)", "A technology exhibition for school students of classes 9–12.", "Exhibition"),
      createEvent("full-union", "Full Union", "The U25 India–Northeast inter-institutional quiz.", "Quiz"),
      createEvent("syntax-junior", "SYNTAX (Junior Level)", "The junior-grade mega debate competition.", "Interactive"),
      createEvent("treasure-hunt", "Treasure Hunt", "A campus-wide quest involving clues, puzzles and teamwork.", "Interactive"),
      createEvent("grandmasterix", "GrandmasteriX", "A chess competition testing strategy and precision.", "Recreational"),
      createEvent("mystery-event", "Mystery Event", "Car exhibition.", "Exhibition"),
      createEvent("invited-talks", "Invited Talks", "Talks by invited speakers.", "Talk"),
      createEvent("full-house", "Full House", "The U25 SPENT quiz covering sports and entertainment.", "Quiz"),
      createEvent("syntax-senior", "SYNTAX (Senior Level)", "The senior-grade mega debate competition.", "Interactive"),
      createEvent("cubernetics", "Cubernetics", "A Rubik's Cube solving competition.", "Recreational"),
      createEvent("techxibition-ug", "TechXibition (UG Level)", "A technology exhibition for undergraduate students.", "Exhibition"),
      createEvent("circuitrix", "Circuitrix", "A circuit-building competition.", "Technical"),
      createEvent("constrolix", "Constrolix", "A bridge construction and engineering challenge.", "Technical"),
      createEvent("metanoia", "Metanoia", "A battle of bands featuring rock and metal performances.", "Cultural"),
      createEvent("trinket-tales", "Trinket Tales", "A hands-on ceramic trinket painting experience by Museo.", "Recreational"),
    ],
  },
  {
    id: "day-3",
    label: "Day Three",
    date: "31 JAN 2027",
    theme: "The Grand Finale",
    events: [
      createEvent("conxetra", "ConXetra", "A cosplay showcase celebrating character craftsmanship and stage presentation.", "Interactive"),
      createEvent("scholars-orbit", "Scholar's Orbit", "A research-based poster presentation.", "Technical"),
      createEvent("full-volume", "Full Volume", "The U25 inter-institutional general quiz.", "Quiz"),
      createEvent("full-stack", "Full Stack", "The U25 science, business and technology quiz.", "Quiz"),
      createEvent("cad-clash", "CAD Clash", "An AutoCAD design competition.", "Technical"),
      createEvent("tic-on-board", "Tic(k) on Board", "A board-game redesign challenge.", "Technical"),
      createEvent("trinket-tales", "Trinket Tales", "A hands-on ceramic trinket painting experience by Museo.", "Recreational"),
    ],
  },
];
