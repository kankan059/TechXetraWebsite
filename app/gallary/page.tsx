import type { Metadata } from "next";
import Galary from '@/components/sections/galary/Galary';
import DomeGallery from '@/components/sections/galary/DomGalary';
export const metadata: Metadata = {
  title: "Gallery | TechXetra 2026",
  description: "Photos and moments from TechXetra.",
};

const page = () => {
  return (
    // <Galary/>
    <div style={{ width: '100vw', height: '100vh' }}>
      <DomeGallery
        fit={0.9}
        minRadius={800}
        maxVerticalRotationDeg={11}
        segments={34}
        dragDampening={2.8}
        grayscale={false}
      />
    </div>
  )
}

export default page