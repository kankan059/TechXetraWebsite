"use client";

import React, { useEffect, useState } from "react";
import SplashCursor from "@/lib/splashCursor";
import GlowCursor from "./GLowCursor";
import ClickSpark from "./ClickSpark";

const GlobalEffect = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    return (
        <>
            <ClickSpark
                sparkColor="#ffffff"
                sparkSize={24}
                sparkRadius={35}
                sparkCount={8}
                duration={500}
            />

            {!isMobile && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        zIndex: 9999,
                        pointerEvents: "none",
                    }}
                >
                    <GlowCursor
                        color="#67E8F9"
                        secondaryColor="#A78BFA"
                        trailLength={21}
                        trailWidth={4}
                        trailTaper={0.8}
                        followSpeed={0.29}
                        glowIntensity={2.45}
                        glowSpread={1.2}
                        hotspot={0.78}
                        brightness={1.35}
                        opacity={1}
                        pulseSpeed={2.4}
                        noiseStrength={0.035}
                        idleFade
                        idleTimeout={700}
                        fadeDuration={1250}
                        blendMode="plus-lighter"
                    />
                </div>
            )}
        </>
    );
};

export default GlobalEffect;


// import SplashCursor from "@/lib/splashCursor";
 {/* <SplashCursor
          DENSITY_DISSIPATION={3.5}
          VELOCITY_DISSIPATION={2}
          PRESSURE={0.1}
          CURL={3}
          SPLAT_RADIUS={0.2}
          SPLAT_FORCE={6000}
          SHADING={true}
          COLOR_UPDATE_SPEED={10}
          RAINBOW_MODE={false}
          COLOR="#e8e5ea"
        /> */}

