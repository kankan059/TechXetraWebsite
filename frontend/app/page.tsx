import About from "@/components/sections/about/About";
import ComingSoon from "@/components/sections/ComingSoon";
import EventGlimpse from "@/components/sections/events/EventGlimpse";
import ExodusHero from "@/components/sections/hero/ExodusHero";
import Hero from "@/components/sections/hero/Hero";
import HeroQA from "@/components/sections/hero/HeroQA";
import SponserGlimpse from "@/components/sections/sponser/SponserGlimpse";
import { heroQuestions } from "@/data/info/hero-qa";

export default function HomePage() {
  return (
    <div className="">
      <main>

        {/* <ComingSoon/> */}
        <ExodusHero/>
        {/* <Hero/> */}
        <About />
        <EventGlimpse />
        <SponserGlimpse />
        <HeroQA questions={heroQuestions} />
      </main>
    </div>
  );
}
