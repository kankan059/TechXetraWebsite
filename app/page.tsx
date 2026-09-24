"use client"
import About from '@/components/sections/about/About'
import Hero from '@/components/sections/hero/Hero'
import { useState } from 'react'

const Page = () => {

  return (
    <div>

      <main>
        <Hero />
        <About />

      </main>
    </div>
  )
}

export default Page