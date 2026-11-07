export interface Media {
  id: string;
  src: string; // image url (also used as the poster when a video is set)
  video?: string; // optional video url
  width: number;
  height: number;
  title: string; // performer name or event name
  year: number;
}

export const PERFORMERS: Media[] = [
  { id: "p1", src: "", width: 900, height: 1200, title: "Aarav Sharma", year: 2025 },
  { id: "p2", src: "https://picsum.photos/seed/perf-2/900/1200", width: 900, height: 1200, title: "Meera Iyer", year: 2025 },
  { id: "p3", src: "https://picsum.photos/seed/perf-3/1600/1000", width: 1600, height: 1000, title: "Nova Collective", year: 2024 },
  { id: "p4", src: "https://picsum.photos/seed/perf-4/900/1200", width: 900, height: 1200, title: "Kabir Mehta", year: 2024 },
  { id: "p5", src: "https://picsum.photos/seed/perf-5/900/1200", width: 900, height: 1200, title: "Sana Qureshi", year: 2024 },
  {
    id: "p6",
    src: "https://picsum.photos/seed/perf-6/1600/900",
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    width: 1600,
    height: 900,
    title: "Rhythm House",
    year: 2023,
  },
  { id: "p7", src: "https://picsum.photos/seed/perf-7/900/1200", width: 900, height: 1200, title: "Rohan Das", year: 2023 },
  { id: "p8", src: "https://picsum.photos/seed/perf-8/900/1200", width: 900, height: 1200, title: "Ishita Kapoor", year: 2023 },
  { id: "p9", src: "https://picsum.photos/seed/perf-9/900/1200", width: 900, height: 1200, title: "Dr. Neha Verma", year: 2022 },
  { id: "p10", src: "https://picsum.photos/seed/perf-10/900/1200", width: 900, height: 1200, title: "The Late Shift", year: 2022 },
  { id: "p11", src: "https://tse1.mm.bing.net/th/id/OIP.Ev024dlFjgeVvNDo-FhjlQHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3", width: 900, height: 1200, title: "Anushka Manchanda", year: 2012 },
  { id: "p12", src: "https://alchetron.com/cdn/bhayanak-maut-8da71d08-794f-43a6-aeb9-0da0906da48-resize-750.jpeg", width: 900, height: 1200, title: "Bhayanak maut", year: 2011 },
];

export const EVENT_PHOTOS: Media[] = [
  { id: "e1", src: "https://lh3.google.com/u/0/d/1dlclxZ0cwxySHKC8isSvlmMBlheOmm1I=w1907-h1072-iv1?auditContext=prefetch", width: 1600, height: 1000, title: "Main hall during the opening", year: 2024 },
  { id: "e2", src: "https://picsum.photos/seed/evt-2/900/1200", width: 900, height: 1200, title: "Robotics finals", year: 2025 },
  { id: "e3", src: "https://picsum.photos/seed/evt-3/1400/1050", width: 1400, height: 1050, title: "Prize distribution", year: 2024 },
  { id: "e4", src: "https://picsum.photos/seed/evt-4/900/1200", width: 900, height: 1200, title: "Workshop session", year: 2024 },
  { id: "e5", src: "https://picsum.photos/seed/evt-5/1600/900", width: 1600, height: 900, title: "Night sky session", year: 2024 },
  { id: "e6", src: "https://picsum.photos/seed/evt-6/900/1200", width: 900, height: 1200, title: "Backstage", year: 2023 },
  { id: "e7", src: "https://picsum.photos/seed/evt-7/1400/1050", width: 1400, height: 1050, title: "Panel discussion", year: 2023 },
  { id: "e8", src: "https://picsum.photos/seed/evt-8/900/1200", width: 900, height: 1200, title: "Volunteers at the gate", year: 2023 },
  { id: "e9", src: "https://picsum.photos/seed/evt-9/1600/1000", width: 1600, height: 1000, title: "Audience", year: 2022 },
  { id: "e10", src: "https://picsum.photos/seed/evt-10/900/1200", width: 900, height: 1200, title: "Organising team", year: 2022 },
];