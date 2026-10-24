import About from "@/components/sections/about/About";
import EventGlimpse from "@/components/sections/events/EventGlimpse";
import Hero from "@/components/sections/hero/Hero";
import HeroQA from "@/components/sections/hero/HeroQA";
import { heroQuestions } from "@/data/info/hero-qa";

export default function HomePage() {
  return (
    <div className="">
      <main>
        <Hero />
        <About />
        <EventGlimpse />
        <HeroQA questions={heroQuestions} />
      </main>
    </div>
  );
}
