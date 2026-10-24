"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";

type LogoTechProps = {
  progressRef: RefObject<{ value: number }>;
  opacityRef: RefObject<{ value: number }>;
  logoSrc?: string;
};

const LogoTech = ({
  progressRef,
  opacityRef,
  logoSrc = "/favicon.svg",
}: LogoTechProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;
    let frameId = 0;
    let resizeFrame = 0;
    let imageTexture: THREE.CanvasTexture | null = null;
    let isVisible = false;
    let needsRender = true;
    let previousProgress = Number.NaN;
    let previousOpacity = Number.NaN;

    const isMobile = window.innerWidth < 768;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100
    );

    camera.position.z = !isMobile ? 6 : 4;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, isMobile ? 1.1 : 1.5)
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);

    // Slightly smaller scale to prevent clipping.
    root.scale.setScalar(isMobile ? 0.72 : 1.05);

    const logoColor = new THREE.Color("#65E8FF");
    const whiteColor = new THREE.Color("#FFFFFF");

    let logoGeometry: THREE.BufferGeometry | null = null;
    let glowGeometry: THREE.BufferGeometry | null = null;
    let logoMaterial: THREE.PointsMaterial | null = null;
    let glowMaterial: THREE.PointsMaterial | null = null;

    let targetPositions: Float32Array | null = null;
    let scatteredPositions: Float32Array | null = null;

    const createGlowTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;

      const context = canvas.getContext("2d");
      if (!context) return null;

      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);

      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.18, "rgba(130,235,255,0.8)");
      gradient.addColorStop(0.5, "rgba(40,160,255,0.22)");
      gradient.addColorStop(1, "rgba(0,100,255,0)");

      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);

      return new THREE.CanvasTexture(canvas);
    };

    imageTexture = createGlowTexture();

    const buildLogo = async () => {
      const image = new Image();
      image.src = logoSrc;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error(`Unable to load logo image: ${logoSrc}`));
      });

      if (destroyed) return;

      const canvas = document.createElement("canvas");
      const size = 600;

      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.clearRect(0, 0, size, size);

      // Contain the image while preserving its aspect ratio.
      const aspect = image.width / image.height;
      const drawWidth = aspect >= 1 ? size * 0.88 : size * 0.7;
      const drawHeight = drawWidth / aspect;

      context.drawImage(
        image,
        (size - drawWidth) / 2,
        (size - drawHeight) / 2,
        drawWidth,
        drawHeight
      );

      const imageData = context.getImageData(0, 0, size, size);
      const candidates: { x: number; y: number }[] = [];

      const step = isMobile ? 8 : 5;

      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          const index = (y * size + x) * 4;

          if (imageData.data[index + 3] > 70) {
            candidates.push({ x, y });
          }
        }
      }

      if (!candidates.length || destroyed) {
        console.error("LogoTech: no visible pixels found in logo image.");
        return;
      }

      // Shuffle the sampled pixels.
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      const particleCount = Math.min(
        candidates.length,
        isMobile ? 1000 : 2200
      );

      const selected = candidates.slice(0, particleCount);

      targetPositions = new Float32Array(particleCount * 3);
      scatteredPositions = new Float32Array(particleCount * 3);

      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const point = selected[i];

        // Target positions form the source logo.
        targetPositions[i3] = (point.x / size - 0.5) * 4.2;
        targetPositions[i3 + 1] = -(point.y / size - 0.5) * 4.2;
        targetPositions[i3 + 2] = (Math.random() - 0.5) * 0.08;

        // Keep scattered particles closer to the logo.
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.4 + Math.random() * 1.8;

        scatteredPositions[i3] = Math.cos(angle) * radius;
        scatteredPositions[i3 + 1] = Math.sin(angle) * radius;
        scatteredPositions[i3 + 2] = (Math.random() - 0.5) * 1.2;

        const color = Math.random() > 0.86 ? whiteColor : logoColor;

        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
      }

      // Start from the scattered positions; GSAP controls progress.
      const initialPositions = scatteredPositions.slice();

      logoGeometry = new THREE.BufferGeometry();
      logoGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(initialPositions, 3)
      );
      logoGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(colors, 3)
      );

      logoMaterial = new THREE.PointsMaterial({
        size: isMobile ? 0.045 : 0.035,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      });

      root.add(new THREE.Points(logoGeometry, logoMaterial));

      glowGeometry = new THREE.BufferGeometry();
      glowGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(initialPositions.slice(), 3)
      );
      glowGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(colors, 3)
      );

      glowMaterial = new THREE.PointsMaterial({
        size: isMobile ? 0.09 : 0.075,
        map: imageTexture || undefined,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      });

      root.add(new THREE.Points(glowGeometry, glowMaterial));
      needsRender = true;
    };

    buildLogo().catch((error) => {
      console.error("LogoTech:", error);
    });

    const render = () => {
      if (destroyed) return;

      frameId = 0;
      if (!isVisible) return;

      const progress = THREE.MathUtils.clamp(progressRef.current.value, 0, 1);
      const opacity = THREE.MathUtils.clamp(opacityRef.current.value, 0, 1);
      const progressChanged = progress !== previousProgress;

      if (
        needsRender ||
        progressChanged ||
        opacity !== previousOpacity
      ) {
        if (
          targetPositions &&
          scatteredPositions &&
          logoGeometry &&
          glowGeometry &&
          progressChanged
        ) {
          const logoAttribute = logoGeometry.getAttribute(
            "position"
          ) as THREE.BufferAttribute;

          const glowAttribute = glowGeometry.getAttribute(
            "position"
          ) as THREE.BufferAttribute;

          const logoArray = logoAttribute.array as Float32Array;
          const glowArray = glowAttribute.array as Float32Array;

          for (let i = 0; i < targetPositions.length; i++) {
            const position = THREE.MathUtils.lerp(
              scatteredPositions[i],
              targetPositions[i],
              progress
            );

            logoArray[i] = position;
            glowArray[i] = position;
          }

          logoAttribute.needsUpdate = true;
          glowAttribute.needsUpdate = true;
        }

        if (logoMaterial) {
          logoMaterial.opacity = opacity * (0.35 + progress * 0.65);
        }

        if (glowMaterial) {
          glowMaterial.opacity = opacity * progress * 0.24;
        }

        renderer.render(scene, camera);
        needsRender = false;
        previousProgress = progress;
        previousOpacity = opacity;
      }

      frameId = requestAnimationFrame(render);
    };

    const requestRender = () => {
      needsRender = true;
      if (isVisible && !frameId) {
        frameId = requestAnimationFrame(render);
      }
    };

    const handleResize = () => {
      cancelAnimationFrame(resizeFrame);

      resizeFrame = requestAnimationFrame(() => {
        if (destroyed) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        if (!width || !height) return;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setPixelRatio(
          Math.min(
            window.devicePixelRatio || 1,
            window.innerWidth < 768 ? 1.1 : 1.5
          )
        );

        renderer.setSize(width, height);
        requestRender();
      });
    };

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;

      if (isVisible) {
        requestRender();
      } else {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    });
    intersectionObserver.observe(container);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      destroyed = true;

      cancelAnimationFrame(frameId);
      cancelAnimationFrame(resizeFrame);

      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("resize", handleResize);

      logoGeometry?.dispose();
      glowGeometry?.dispose();
      logoMaterial?.dispose();
      glowMaterial?.dispose();
      imageTexture?.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [progressRef, opacityRef, logoSrc]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none relative h-full min-h-[260px] w-full overflow-hidden"
    />
  );
};

export default LogoTech;