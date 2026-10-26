import type { Metadata } from "next";
import DomeGallery from "@/components/sections/galary/DomGalary";
import { getDomGalleryImages } from "@/data/galary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery | TechXetra 2026",
  description: "Photos and moments from TechXetra.",
};

export default async function GalleryPage() {
  const images = await getDomGalleryImages();

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <DomeGallery
        images={images}
        fit={0.9}
        minRadius={800}
        maxVerticalRotationDeg={4}
        segments={34}
        dragDampening={2.8}
        grayscale={false}
      />
    </div>
  );
}
