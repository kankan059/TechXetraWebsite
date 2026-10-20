"use client";

import React, { useEffect, useRef, useCallback } from "react";

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  extraScale?: number;
  children?: React.ReactNode;
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

const ClickSpark: React.FC<ClickSparkProps> = ({
  sparkColor = "#fff",
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = "ease-out",
  extraScale = 1,
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);

  const easeFunc = useCallback(
    (t: number) => {
      switch (easing) {
        case "linear":
          return t;
        case "ease-in":
          return t * t;
        case "ease-in-out":
          return t < 0.5
            ? 2 * t * t
            : -1 + (4 - 2 * t) * t;
        default:
          return t * (2 - t);
      }
    },
    [easing]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;

      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handleClick = (event: MouseEvent) => {
      const now = performance.now();

      for (let i = 0; i < sparkCount; i++) {
        sparksRef.current.push({
          x: event.clientX,
          y: event.clientY,
          angle: (Math.PI * 2 * i) / sparkCount,
          startTime: now,
        });
      }
    };

    const render = (timestamp: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;

        if (elapsed >= duration) {
          return false;
        }

        const progress = elapsed / duration;
        const eased = easeFunc(progress);

        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);

        const x1 =
          spark.x + distance * Math.cos(spark.angle);
        const y1 =
          spark.y + distance * Math.sin(spark.angle);

        const x2 =
          spark.x +
          (distance + lineLength) *
            Math.cos(spark.angle);

        const y2 =
          spark.y +
          (distance + lineLength) *
            Math.sin(spark.angle);

        const opacity = 1 - progress;

        ctx.save();

        ctx.globalAlpha = opacity;
        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.restore();

        return true;
      });

      requestAnimationFrame(render);
    };

    resize();

    window.addEventListener("resize", resize);
    window.addEventListener("click", handleClick);

    const animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationId);
    };
  }, [
    sparkColor,
    sparkSize,
    sparkRadius,
    sparkCount,
    duration,
    easeFunc,
    extraScale,
  ]);

  return (
    <>
      {children}

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 999999,
        }}
      />
    </>
  );
};

export default ClickSpark;