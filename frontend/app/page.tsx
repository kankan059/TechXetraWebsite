// "use client";

// import Link from "next/link";
import About from "@/components/sections/about/About";
import EventGlimpse from "@/components/sections/events/EventGlimpse";
import ExodusHero from "@/components/sections/hero/ExodusHero";
import Hero from "@/components/sections/hero/Hero";
// import Platform from "@/components/sections/hero/Plateform";

export default function HomePage() {
  return (
    <div className="">
      <main>
        <ExodusHero/>
        {/* <Hero/> */}
        <About />
        <EventGlimpse />

        {/* <Platform/> */}
      </main>
    </div>
  );
}
