"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function createParticleTexture() {
  const canvas = document.createElement("canvas");

  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    32,
    32,
    0,
    32,
    32,
    32
  );

  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.28)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

export default function BackGround() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: "high-performance",
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(
      isMobile
        ? Math.min(window.devicePixelRatio, 1.2)
        : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setClearColor(0x060606, 1);

    container.appendChild(renderer.domElement);

    const particleTexture = createParticleTexture();

    const starGroup = new THREE.Group();
    const glowGroup = new THREE.Group();

    scene.add(starGroup);
    scene.add(glowGroup);

    const CYAN = new THREE.Color("#1694be");
    const SOFT_CYAN = new THREE.Color("#57d8ff");
    const BRONZE = new THREE.Color("#b97946");
    const CREAM = new THREE.Color("#f3ead4");

    // Main star field.

    const starCount = isMobile ? 900 : 5200;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSpeeds = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      starPositions[i3] = (Math.random() - 0.5) * 24;
      starPositions[i3 + 1] = (Math.random() - 0.5) * 16;
      starPositions[i3 + 2] = -Math.random() * 24;

      const random = Math.random();
      const color =
        random > 0.97
          ? CREAM
          : random > 0.9
          ? BRONZE
          : random > 0.45
          ? SOFT_CYAN
          : CYAN;

      starColors[i3] = color.r;
      starColors[i3 + 1] = color.g;
      starColors[i3 + 2] = color.b;

      starSpeeds[i] = isMobile
        ? 0.012 + Math.random() * 0.012
        : 0.018 + Math.random() * 0.02;
    }

    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3)
    );
    starsGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(starColors, 3)
    );

    const starsMaterial = new THREE.PointsMaterial({
      size: isMobile ? 0.045 : 0.09,
      map: particleTexture || undefined,
      transparent: true,
      opacity: isMobile ? 0.7 : 0.82,
      vertexColors: true,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(
      starsGeometry,
      starsMaterial
    );

    starGroup.add(stars);

    // Bigger glow particles.

    const glowCount = isMobile ? 120 : 420;
    const glowPositions = new Float32Array(glowCount * 3);
    const glowColors = new Float32Array(glowCount * 3);
    const glowSpeeds = new Float32Array(glowCount);

    for (let i = 0; i < glowCount; i++) {
      const i3 = i * 3;

      glowPositions[i3] = (Math.random() - 0.5) * 22;
      glowPositions[i3 + 1] = (Math.random() - 0.5) * 14;
      glowPositions[i3 + 2] = -Math.random() * 24;

      const random = Math.random();
      const color =
        random > 0.88 ? BRONZE : SOFT_CYAN;

      glowColors[i3] = color.r;
      glowColors[i3 + 1] = color.g;
      glowColors[i3 + 2] = color.b;

      glowSpeeds[i] = isMobile
        ? 0.008 + Math.random() * 0.01
        : 0.012 + Math.random() * 0.014;
    }

    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(glowPositions, 3)
    );
    glowGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(glowColors, 3)
    );

    const glowMaterial = new THREE.PointsMaterial({
      size: isMobile ? 0.12 : 0.35,
      map: particleTexture || undefined,
      transparent: true,
      opacity: isMobile ? 0.12 : 0.26,
      vertexColors: true,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    const glowParticles = new THREE.Points(
      glowGeometry,
      glowMaterial
    );

    glowGroup.add(glowParticles);

    // Pointer changes the flow direction.

    const pointer = new THREE.Vector2(0, 0);
    const pointerSmooth = new THREE.Vector2(0, 0);
    const flowTarget = new THREE.Vector2(0, 0);
    const flowCurrent = new THREE.Vector2(0, 0);

    const updatePointer = (
      clientX: number,
      clientY: number
    ) => {
      const x = clientX / window.innerWidth;
      const y = clientY / window.innerHeight;

      pointer.set(x * 2 - 1, -(y * 2 - 1));

      flowTarget.set(
        (x - 0.5) * 0.9,
        (0.5 - y) * 0.6
      );
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointer(event.clientX, event.clientY);
    };

    const handlePointerLeave = () => {
      flowTarget.set(0, 0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    let frameId = 0;
    const clock = new THREE.Timer();

    const animate = () => {
      const time = clock.getElapsed();

      pointerSmooth.x += (pointer.x - pointerSmooth.x) * (isMobile ? 0.025 : 0.04);
      pointerSmooth.y += (pointer.y - pointerSmooth.y) * (isMobile ? 0.025 : 0.04);

      flowCurrent.x += (flowTarget.x - flowCurrent.x) * (isMobile ? 0.02 : 0.035);
      flowCurrent.y += (flowTarget.y - flowCurrent.y) * (isMobile ? 0.02 : 0.035);

      const starsPositionAttr =
        starsGeometry.getAttribute("position") as THREE.BufferAttribute;

      const starsArray = starsPositionAttr.array as Float32Array;

      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;

        starsArray[i3] += flowCurrent.x * starSpeeds[i] * 0.12;
        starsArray[i3 + 1] += flowCurrent.y * starSpeeds[i] * 0.12;
        starsArray[i3 + 2] += starSpeeds[i];

        if (starsArray[i3 + 2] > 6) {
          starsArray[i3] = (Math.random() - 0.5) * 24;
          starsArray[i3 + 1] = (Math.random() - 0.5) * 16;
          starsArray[i3 + 2] = -24;
        }

        if (starsArray[i3] > 14) starsArray[i3] = -14;
        if (starsArray[i3] < -14) starsArray[i3] = 14;
        if (starsArray[i3 + 1] > 10) starsArray[i3 + 1] = -10;
        if (starsArray[i3 + 1] < -10) starsArray[i3 + 1] = 10;
      }

      starsPositionAttr.needsUpdate = true;

      const glowPositionAttr =
        glowGeometry.getAttribute("position") as THREE.BufferAttribute;

      const glowArray = glowPositionAttr.array as Float32Array;

      for (let i = 0; i < glowCount; i++) {
        const i3 = i * 3;

        glowArray[i3] += flowCurrent.x * glowSpeeds[i] * 0.18;
        glowArray[i3 + 1] += flowCurrent.y * glowSpeeds[i] * 0.18;
        glowArray[i3 + 2] += glowSpeeds[i];

        if (glowArray[i3 + 2] > 6) {
          glowArray[i3] = (Math.random() - 0.5) * 22;
          glowArray[i3 + 1] = (Math.random() - 0.5) * 14;
          glowArray[i3 + 2] = -24;
        }

        if (glowArray[i3] > 14) glowArray[i3] = -14;
        if (glowArray[i3] < -14) glowArray[i3] = 14;
        if (glowArray[i3 + 1] > 10) glowArray[i3 + 1] = -10;
        if (glowArray[i3 + 1] < -10) glowArray[i3 + 1] = 10;
      }

      glowPositionAttr.needsUpdate = true;

      starGroup.rotation.y = pointerSmooth.x * 0.06 + time * 0.005;
      starGroup.rotation.x = pointerSmooth.y * 0.04 + Math.sin(time * 0.15) * 0.01;

      glowGroup.rotation.y = pointerSmooth.x * 0.1 + time * 0.008;
      glowGroup.rotation.x = pointerSmooth.y * 0.06 + Math.sin(time * 0.2) * 0.012;

      glowGroup.position.x = pointerSmooth.x * 0.18;
      glowGroup.position.y = pointerSmooth.y * 0.12;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      const mobileNow = window.innerWidth < 768;

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(
        mobileNow
          ? Math.min(window.devicePixelRatio, 1.2)
          : Math.min(window.devicePixelRatio, 2)
      );
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", handleResize);

      starsGeometry.dispose();
      starsMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      particleTexture?.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen bg-[#060606]"
    />
  );
}