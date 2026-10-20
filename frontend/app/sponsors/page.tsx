import React from 'react'
import type { Metadata } from 'next';
import SponsorPage from '@/components/sections/sponser/SponsorPage';

export const metadata: Metadata = {
  title: "Sponsors | TechXetra",
  description:
    "Meet the partners supporting TechXetra at Tezpur University. Sponsorship announcements coming soon.",
};


const sponser = () => {
  return (
   <SponsorPage/>
  )
}

export default sponser