import Events from '@/components/sections/events/Events'
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: "Events | TechXetra 2026",
  description: "Events of TechXetra.",
};

const events = () => {
  return (
    <Events/>
  )
}

export default events