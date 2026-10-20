import Team from '@/components/sections/team/Team'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Team | TechXetra 2026",
  description: "The Team Behind TechXetra.",
};

const team = () => {
  return (
    <Team />
  )
}

export default team