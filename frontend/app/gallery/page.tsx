import type { Metadata } from "next";
import GalaryMain from "@/components/sections/galary/GalaryMain";
import Galarynew from "@/components/sections/galary/Galarynew";

export const metadata: Metadata = {
  title: "Gallery | TechXetra 2026",
  description: "Past performers, photographs and videos from TechXetra.",
};

const performers = [
  {
    id: "performer-1",
    name: "Live DJ Performance",
    category: "Electronic Music",
    year: "2025",
    image:
      "https://images.unsplash.com/photo-1571266028243-d220c9c3b3c4?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "performer-2",
    name: "The Stage Experience",
    category: "Live Performance",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "performer-3",
    name: "Festival Nights",
    category: "Music Festival",
    year: "2025",
    image:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "performer-4",
    name: "The Crowd",
    category: "Live Event",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1000&q=85",
  },
];

const videos = [
  {
    id: "video-1",
    title: "TechXetra Aftermovie",
    year: "2025",
    thumbnail:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85",
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
  {
    id: "video-2",
    title: "Festival Highlights",
    year: "2024",
    thumbnail:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=85",
    videoUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
  },
];

export default function GalleryPage() {
  return (
    <main>
      {/* <GalaryMain
        performers={performers}
        videos={videos}
      /> */}
      <Galarynew/>
    </main>
  );
}