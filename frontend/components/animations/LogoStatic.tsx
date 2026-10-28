
"use client";

import { useEffect, useRef } from "react";

type LogoStaticProps = {
  logoSrc?: string;
  className?: string;
};

export default function LogoStatic({
  logoSrc = "/favicon.svg",
  className = "",
}: LogoStaticProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let image: HTMLImageElement | undefined;

    const renderLogo = () => {
      if (disposed) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      const size = 420;
      canvas.width = size;
      canvas.height = size;
      image = new Image();

      image.onload = () => {
        if (disposed || !image) return;

        const offscreen = document.createElement("canvas");
        offscreen.width = size;
        offscreen.height = size;

        const source = offscreen.getContext("2d");
        if (!source) return;

        const scale = Math.min(
          (size * 0.84) / image.width,
          (size * 0.84) / image.height
        );

        const width = image.width * scale;
        const height = image.height * scale;

        source.clearRect(0, 0, size, size);
        source.drawImage(
          image,
          (size - width) / 2,
          (size - height) / 2,
          width,
          height
        );

        const pixels = source.getImageData(0, 0, size, size).data;

        const cyanDots = new Path2D();
        const whiteDots = new Path2D();

        for (let y = 0; y < size; y += 4) {
          for (let x = 0; x < size; x += 4) {
            const index = (y * size + x) * 4;
            if (pixels[index + 3] < 70) continue;

            const white = (x * 7 + y * 13) % 17 === 0;
            const radius = white ? 1.65 : 1.35;
            (white ? whiteDots : cyanDots).moveTo(x + radius, y);
            (white ? whiteDots : cyanDots).arc(x, y, radius, 0, Math.PI * 2);
          }
        }

        context.clearRect(0, 0, size, size);
        context.save();
        context.globalCompositeOperation = "lighter";
        context.fillStyle = "rgba(65,205,255,0.88)";
        context.fill(cyanDots);
        context.fillStyle = "rgba(225,250,255,0.95)";
        context.fill(whiteDots);
        context.restore();
      };

      image.onerror = () => {
        console.error(`Unable to load static logo: ${logoSrc}`);
      };

      image.src = logoSrc;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        observer.disconnect();
        renderLogo();
      },
      { rootMargin: "100px" }
    );
    observer.observe(canvas);

    return () => {
      disposed = true;
      observer.disconnect();

      if (image) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [logoSrc]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none block h-full w-full ${className}`}
      style={{ filter: "drop-shadow(0 0 6px rgba(22,175,255,0.65))" }}
    />
  );
}
