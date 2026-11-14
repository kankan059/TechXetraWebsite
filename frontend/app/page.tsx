import About from "@/components/sections/about/About";
import ComingSoon from "@/components/sections/ComingSoon";
import EventGlimpse from "@/components/sections/events/EventGlimpse";
import ExodusHero from "@/components/sections/hero/ExodusHero";
import HeroQA from "@/components/sections/hero/HeroQA";
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
        {/* <SponserGlimpse /> */}
        <HeroQA questions={heroQuestions} />
      </main>
    </div>
  );
}
