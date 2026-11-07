import type { Metadata } from "next";
import Galarynew from "@/components/sections/galary/Galarynew";

export const metadata: Metadata = {
  title: "Gallery | TechXetra 2026",
  description: "Past performers, photographs and videos from TechXetra.",
};



// const videos = [
//   {
//     id: "video-1",
//     title: "TechXetra Aftermovie",
//     year: "2025",
//     thumbnail:
//       "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85",
//     videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
//   },
//   {
//     id: "video-2",
//     title: "Festival Highlights",
//     year: "2024",
//     thumbnail:
//       "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=85",
//     videoUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
//   },
// ];

export default function GalleryPage() {
  return (
    <main>
      <Galarynew/>
    </main>
  );
}