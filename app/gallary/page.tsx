import React from 'react'
import type { Metadata } from "next";
import Galary from '@/components/sections/galary/Galary';
export const metadata: Metadata = {
  title: "Gallery | TechXetra 2026",
  description: "Photos and moments from TechXetra.",
};


const page = () => {
  return (
    <Galary/>
  )
}

export default page