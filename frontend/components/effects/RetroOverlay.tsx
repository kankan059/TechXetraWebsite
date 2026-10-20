
"use client";

import React from "react";

const RetroOverlay = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255, 220, 180, 0.12) 4px)",
        }}
      />

      <div className="retro-film-grain absolute inset-0 opacity-[0.09]" />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080b12]/20" />
    </div>
  );
};

export default RetroOverlay;
