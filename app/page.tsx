"use client"
import Footer from '@/components/layouts/Footer'
import About from '@/components/sections/about/About'
import EventGlimpse from '@/components/sections/events/EventGlimpse'
import Hero from '@/components/sections/hero/Hero'

const Page = () => {

  return (
    <div>

      <main>
        <Hero />
        <About />
        <EventGlimpse/>
        <Footer/>
      </main>
    </div>
  )
}

export default Page