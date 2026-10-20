
"use client";

import Link from "next/link";
import SectionTitle from "@/components/ui/SectionTitle";
import DepthCarousel from "@/components/animations/DepthCarousel";
import eventGlimpse from "@/data/info/eventGlimpse";
import Button from "@/components/ui/Button";

const EventGlimpse = () => {
  const events = eventGlimpse.events.map(({ title, category, image }) => ({
    title,
    subtitle: category,
    image,
    alt: title,
  }));

  return (
    <section
      id="event-glimpse"
      className="relative w-full overflow-hidden px-5 pb-10 pt-24 text-white sm:px-8 sm:pb-12 sm:pt-28 lg:px-12 lg:pb-14 lg:pt-28 xl:px-20"
    >
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionTitle
          title={eventGlimpse.title}
          align="left"
        />

        <div style={{ height: '500px', position: 'relative' }}>
          <DepthCarousel
            items={events}
            depth={290}
            spread={90}
            tilt={19}
            tiltDirection="right"
            perspective={1400}
            visibleCards={4}
            falloff={0.2}
            blur={9}
            autoplay={false}
            loop
            cardWidth={270}
            cardHeight={370}
            radius={19}
            tint="#05060a"
            duration={750}
            ease="power3.out"
            autoplayDelay={3200}
            showControls
            showIndicators
          />

        </div>
        <div className=" flex justify-center">
          <Button align="center" href="/events">
            Explore Events
          </Button>

        </div>

      </div>
    </section>
  );
};

export default EventGlimpse;


