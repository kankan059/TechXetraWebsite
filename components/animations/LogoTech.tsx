"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";

gsap.registerPlugin(ScrollTrigger);

export default function LogoTech() {
  const [sceneKey, setSceneKey] = useState(0);
  const mobileRef = useRef<boolean | null>(null);

  useEffect(() => {
    const handleBreakpoint = () => {
      const mobile = window.innerWidth < 768;
      if (mobileRef.current === null) {
        mobileRef.current = mobile;
        return;
      }
      if (mobile !== mobileRef.current) {
        mobileRef.current = mobile;
        setSceneKey((prev) => prev + 1);
      }
    };

    handleBreakpoint();
    window.addEventListener("resize", handleBreakpoint);

    return () => window.removeEventListener("resize", handleBreakpoint);
  }, []);

  return <LogoScene key={sceneKey} />;
}

function LogoScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    let destroyed = false;
    let frameId = 0;
    let resizeFrame = 0;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.1) : Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);

    container.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);

    // Size.
    const baseScale = isMobile ? 0.5 : 0.78;

    // Left / right.
    const baseX = isMobile ? 0 : 3.55;

    // Start height.
    const baseY = isMobile ? 0.0 : 0.095;

    // Downward movement before breakup.
    const moveDistance = isMobile ? 0.9 : 1.35;

    // Extra drop during breakup.
    const scatterDrop = isMobile ? 0.18 : 0.32;

    root.position.set(baseX, baseY, 0);
    root.scale.setScalar(baseScale);

    const pointer = new THREE.Vector2();
    const smoothPointer = new THREE.Vector2();

    let hoverAmount = 0;

    const scrollState = { progress: 0, scatter: 0 };
    const introState = { progress: 0 };

    const CYAN = new THREE.Color("#ffffff");
    const LIGHT_CYAN = new THREE.Color("#ffffff");
    const WHITE = new THREE.Color("#27cfff");

    const createStarTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.12, "rgba(255,255,255,1)");
      gradient.addColorStop(0.4, "rgba(80,215,255,0.5)");
      gradient.addColorStop(1, "rgba(80,215,255,0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);

      return new THREE.CanvasTexture(canvas);
    };

    const starTexture = createStarTexture();

    let pointsGeometry: THREE.BufferGeometry | null = null;
    let sparkleGeometry: THREE.BufferGeometry | null = null;
    let dustGeometry: THREE.BufferGeometry | null = null;
    let linesGeometry: THREE.BufferGeometry | null = null;

    let pointsMaterial: THREE.PointsMaterial | null = null;
    let glowMaterial: THREE.PointsMaterial | null = null;
    let sparkleMaterial: THREE.PointsMaterial | null = null;
    let dustMaterial: THREE.PointsMaterial | null = null;
    let linesMaterial: THREE.LineBasicMaterial | null = null;

    let originalPositions: Float32Array | null = null;
    let scatterDirections: Float32Array | null = null;
    let introOrigins: Float32Array | null = null;

    let sparkleOriginal: Float32Array | null = null;
    let sparkleDirections: Float32Array | null = null;
    let sparkleIntroOrigins: Float32Array | null = null;

    let dustOriginal: Float32Array | null = null;
    let dustDirections: Float32Array | null = null;
    let dustDelay: Float32Array | null = null;
    let dustIntroOrigins: Float32Array | null = null;

    const pickRandom = <T,>(items: T[], count: number) => {
      const result = [...items];
      const limit = Math.min(count, result.length);
      for (let i = 0; i < limit; i++) {
        const randomIndex = i + Math.floor(Math.random() * (result.length - i));
        [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
      }
      return result.slice(0, limit);
    };

    const randomIntroPosition = () => {
      const radius = isMobile ? 2.6 : 3.2;
      return {
        x: (Math.random() - 0.5) * radius * 2.4,
        y: (Math.random() - 0.5) * radius * 1.8,
        z: (Math.random() - 0.5) * 2.8,
      };
    };

    const loadLogo = async () => {
      const image = new Image();
      image.src = "/favicon.svg";

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject();
      });

      if (destroyed) return;

      const canvas = document.createElement("canvas");
      const size = 600;

      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(image, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const candidates: { x: number; y: number }[] = [];
      const step = isMobile ? 10 : 6;

      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          const alpha = imageData.data[(y * size + x) * 4 + 3];
          if (alpha > 70 && Math.random() > 0.1) candidates.push({ x, y });
        }
      }

      const maxParticles = isMobile ? 420 : 1150;
      const selected = pickRandom(candidates, maxParticles);

      if (!selected.length || destroyed) return;

      const positions = new Float32Array(selected.length * 3);
      const colors = new Float32Array(selected.length * 3);

      scatterDirections = new Float32Array(selected.length * 3);
      introOrigins = new Float32Array(selected.length * 3);

      selected.forEach((point, index) => {
        const i3 = index * 3;
        const px = (point.x / size - 0.5) * 4.6;
        const py = -(point.y / size - 0.5) * 4.6;

        positions[i3] = px + (Math.random() - 0.5) * 0.025;
        positions[i3 + 1] = py + (Math.random() - 0.5) * 0.025;
        positions[i3 + 2] = (Math.random() - 0.5) * 0.45;

        const random = Math.random();
        const color = random > 0.84 ? WHITE : random > 0.45 ? LIGHT_CYAN : CYAN;

        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        const length = Math.sqrt(px * px + py * py) || 1;

        scatterDirections![i3] = (px / length) * 0.4 + (Math.random() - 0.5) * 1.35;
        scatterDirections![i3 + 1] = -(0.25 + Math.random() * 1.45);
        scatterDirections![i3 + 2] = (Math.random() - 0.5) * 1.7;

        const intro = randomIntroPosition();

        introOrigins![i3] = intro.x;
        introOrigins![i3 + 1] = intro.y;
        introOrigins![i3 + 2] = intro.z;
      });

      originalPositions = new Float32Array(positions);

      pointsGeometry = new THREE.BufferGeometry();
      pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pointsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      pointsMaterial = new THREE.PointsMaterial({
        size: isMobile ? 0.08 : 0.055,
        map: starTexture || undefined,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(pointsGeometry, pointsMaterial);
      root.add(points);

      glowMaterial = new THREE.PointsMaterial({
        size: isMobile ? 0.095 : 0.205,
        map: starTexture || undefined,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      });

      const glow = new THREE.Points(pointsGeometry, glowMaterial);
      glow.position.z = -0.08;
      root.add(glow);

      const sparkleCount = isMobile ? 55 : 105;

      const sparklePositions = new Float32Array(sparkleCount * 3);
      const sparkleColors = new Float32Array(sparkleCount * 3);

      sparkleDirections = new Float32Array(sparkleCount * 3);
      sparkleIntroOrigins = new Float32Array(sparkleCount * 3);

      for (let i = 0; i < sparkleCount; i++) {
        const i3 = i * 3;
        const source = Math.floor(Math.random() * selected.length);

        sparklePositions[i3] = positions[source * 3];
        sparklePositions[i3 + 1] = positions[source * 3 + 1];
        sparklePositions[i3 + 2] = positions[source * 3 + 2] + 0.05;

        const color = Math.random() > 0.45 ? WHITE : LIGHT_CYAN;

        sparkleColors[i3] = color.r;
        sparkleColors[i3 + 1] = color.g;
        sparkleColors[i3 + 2] = color.b;

        sparkleDirections![i3] = (Math.random() - 0.5) * 1.8;
        sparkleDirections![i3 + 1] = -(0.35 + Math.random() * 1.9);
        sparkleDirections![i3 + 2] = (Math.random() - 0.5) * 2;

        const intro = randomIntroPosition();

        sparkleIntroOrigins![i3] = intro.x * 1.1;
        sparkleIntroOrigins![i3 + 1] = intro.y * 1.1;
        sparkleIntroOrigins![i3 + 2] = intro.z;
      }

      sparkleOriginal = new Float32Array(sparklePositions);

      sparkleGeometry = new THREE.BufferGeometry();
      sparkleGeometry.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
      sparkleGeometry.setAttribute("color", new THREE.BufferAttribute(sparkleColors, 3));

      sparkleMaterial = new THREE.PointsMaterial({
        size: isMobile ? 0.085 : 0.205,
        map: starTexture || undefined,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      });

      const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
      root.add(sparkles);

      const dustCount = isMobile ? 900 : 3800;

      const dustPositions = new Float32Array(dustCount * 3);
      const dustColors = new Float32Array(dustCount * 3);

      dustDirections = new Float32Array(dustCount * 3);
      dustDelay = new Float32Array(dustCount);
      dustIntroOrigins = new Float32Array(dustCount * 3);

      for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;
        const source = Math.floor(Math.random() * selected.length);

        const sx = positions[source * 3];
        const sy = positions[source * 3 + 1];
        const sz = positions[source * 3 + 2];

        const length = Math.sqrt(sx * sx + sy * sy) || 1;

        dustPositions[i3] = sx + (Math.random() - 0.5) * 0.07;
        dustPositions[i3 + 1] = sy + (Math.random() - 0.5) * 0.07;
        dustPositions[i3 + 2] = sz + (Math.random() - 0.5) * 0.12;

        dustDirections![i3] = (sx / length) * (0.25 + Math.random() * 0.7) + (Math.random() - 0.5) * 1.6;
        dustDirections![i3 + 1] = -(0.3 + Math.random() * 2.15);
        dustDirections![i3 + 2] = (Math.random() - 0.5) * 2.3;

        dustDelay![i] = Math.random();

        const intro = randomIntroPosition();

        dustIntroOrigins![i3] = intro.x * 1.35;
        dustIntroOrigins![i3 + 1] = intro.y * 1.35;
        dustIntroOrigins![i3 + 2] = intro.z * 1.1;

        const random = Math.random();
        const color = random > 0.86 ? WHITE : random > 0.42 ? LIGHT_CYAN : CYAN;

        dustColors[i3] = color.r;
        dustColors[i3 + 1] = color.g;
        dustColors[i3 + 2] = color.b;
      }

      dustOriginal = new Float32Array(dustPositions);

      dustGeometry = new THREE.BufferGeometry();
      dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
      dustGeometry.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));

      dustMaterial = new THREE.PointsMaterial({
        size: isMobile ? 0.031 : 0.049,
        map: starTexture || undefined,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      });

      const dust = new THREE.Points(dustGeometry, dustMaterial);
      root.add(dust);

      const linePositions: number[] = [];
      const connectionDistance = isMobile ? 0.39 : 0.44;
      const maxConnections = isMobile ? 1 : 2;

      for (let i = 0; i < selected.length; i++) {
        let connections = 0;

        const ix = positions[i * 3];
        const iy = positions[i * 3 + 1];
        const iz = positions[i * 3 + 2];

        for (let j = i + 1; j < selected.length && connections < maxConnections; j++) {
          const jx = positions[j * 3];
          const jy = positions[j * 3 + 1];
          const jz = positions[j * 3 + 2];

          const dx = ix - jx;
          const dy = iy - jy;
          const dz = iz - jz;

          if (dx * dx + dy * dy + dz * dz < connectionDistance * connectionDistance) {
            linePositions.push(ix, iy, iz, jx, jy, jz);
            connections++;
          }
        }
      }

      linesGeometry = new THREE.BufferGeometry();
      linesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));

      linesMaterial = new THREE.LineBasicMaterial({
        color: "#64ddff",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const lines = new THREE.LineSegments(linesGeometry, linesMaterial);
      root.add(lines);
    };

    loadLogo().catch(() => {});

    const handlePointerMove = (event: PointerEvent) => {
      if (isMobile) return;
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      hoverAmount = event.clientX > window.innerWidth * 0.55 ? 1 : 0;
    };

    const handlePointerLeave = () => {
      hoverAmount = 0;
      pointer.set(0, 0);
    };

    if (!isMobile) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerleave", handlePointerLeave);
    }

    const hero = document.querySelector("#hero");
    let scrollTrigger: ScrollTrigger | undefined;

    if (hero) {
      scrollTrigger = ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: isMobile ? 0.55 : 0.75,
        onUpdate: (self) => {
          const progress = self.progress;
          const moveProgress = THREE.MathUtils.clamp(progress / 0.4, 0, 1);
          const scatterProgress = THREE.MathUtils.clamp((progress - 0.36) / 0.56, 0, 1);

          scrollState.progress = progress;
          scrollState.scatter = scatterProgress;

          root.position.y = baseY - moveProgress * moveDistance - scatterProgress * scatterDrop;
          root.position.z = -moveProgress * (isMobile ? 0.15 : 0.25) - scatterProgress * (isMobile ? 0.18 : 0.3);
          root.rotation.z = scatterProgress * (isMobile ? 0.008 : 0.02);
          root.scale.setScalar(baseScale * (1 - scatterProgress * 0.07));
        },
      });
    }

    const timer = new THREE.Timer();
    timer.connect(document);

    const introConfig = { delay: 0.55, duration: isMobile ? 1.7 : 2.1 };

    const animate = () => {
      timer.update();

      const time = timer.getElapsed();
      const introLinear = THREE.MathUtils.clamp((time - introConfig.delay) / introConfig.duration, 0, 1);
      const introEase = introLinear < 0.5 ? 4 * introLinear * introLinear * introLinear : 1 - Math.pow(-2 * introLinear + 2, 3) / 2;
      const scatter = scrollState.scatter;
      const scatterEase = scatter * scatter;

      introState.progress = introEase;

      if (!isMobile) {
        smoothPointer.x += (pointer.x - smoothPointer.x) * 0.025;
        smoothPointer.y += (pointer.y - smoothPointer.y) * 0.025;
        root.rotation.y += (smoothPointer.x * 0.065 * hoverAmount - root.rotation.y) * 0.025;
        root.rotation.x += (-smoothPointer.y * 0.04 * hoverAmount - root.rotation.x) * 0.025;
        root.position.x = baseX + smoothPointer.x * 0.065 * hoverAmount;
      }

      if (pointsGeometry && originalPositions && scatterDirections && introOrigins) {
        const position = pointsGeometry.getAttribute("position") as THREE.BufferAttribute;
        const array = position.array as Float32Array;

        for (let i = 0; i < array.length; i += 3) {
          const ox = originalPositions[i];
          const oy = originalPositions[i + 1];
          const oz = originalPositions[i + 2];
          const ix = introOrigins[i];
          const iy = introOrigins[i + 1];
          const iz = introOrigins[i + 2];

          const breathe = Math.sin(time * 0.6 + ox * 2 + oy) * (isMobile ? 0.001 : 0.0035);
          const formedX = THREE.MathUtils.lerp(ix, ox, introEase);
          const formedY = THREE.MathUtils.lerp(iy, oy, introEase);
          const formedZ = THREE.MathUtils.lerp(iz, oz, introEase);

          array[i] = formedX + breathe + scatterDirections[i] * scatterEase * (isMobile ? 0.85 : 1.3);
          array[i + 1] = formedY + breathe + scatterDirections[i + 1] * scatterEase * (isMobile ? 1.55 : 2.3);
          array[i + 2] = formedZ + scatterDirections[i + 2] * scatterEase * (isMobile ? 0.6 : 0.95);
        }

        position.needsUpdate = true;
      }

      if (sparkleGeometry && sparkleOriginal && sparkleDirections && sparkleIntroOrigins) {
        const position = sparkleGeometry.getAttribute("position") as THREE.BufferAttribute;
        const array = position.array as Float32Array;

        for (let i = 0; i < array.length; i += 3) {
          const formedX = THREE.MathUtils.lerp(sparkleIntroOrigins[i], sparkleOriginal[i], introEase);
          const formedY = THREE.MathUtils.lerp(sparkleIntroOrigins[i + 1], sparkleOriginal[i + 1], introEase);
          const formedZ = THREE.MathUtils.lerp(sparkleIntroOrigins[i + 2], sparkleOriginal[i + 2], introEase);

          array[i] = formedX + sparkleDirections[i] * scatterEase * (isMobile ? 0.9 : 1.4);
          array[i + 1] = formedY + sparkleDirections[i + 1] * scatterEase * (isMobile ? 1.7 : 2.5);
          array[i + 2] = formedZ + sparkleDirections[i + 2] * scatterEase * (isMobile ? 0.7 : 1);
        }

        position.needsUpdate = true;
      }

      if (dustGeometry && dustOriginal && dustDirections && dustDelay && dustIntroOrigins) {
        const position = dustGeometry.getAttribute("position") as THREE.BufferAttribute;
        const array = position.array as Float32Array;

        for (let i = 0; i < dustDelay.length; i++) {
          const i3 = i * 3;
          const delay = dustDelay[i] * 0.32;
          const local = THREE.MathUtils.clamp((scatter - delay) / (1 - delay), 0, 1);
          const localEase = local * local;

          const formedX = THREE.MathUtils.lerp(dustIntroOrigins[i3], dustOriginal[i3], introEase);
          const formedY = THREE.MathUtils.lerp(dustIntroOrigins[i3 + 1], dustOriginal[i3 + 1], introEase);
          const formedZ = THREE.MathUtils.lerp(dustIntroOrigins[i3 + 2], dustOriginal[i3 + 2], introEase);

          array[i3] = formedX + dustDirections[i3] * localEase * (isMobile ? 0.95 : 1.5) + Math.sin(time * 1.2 + i * 0.17) * 0.03 * local;
          array[i3 + 1] = formedY + dustDirections[i3 + 1] * localEase * (isMobile ? 1.75 : 2.7) + Math.cos(time + i * 0.11) * 0.018 * local;
          array[i3 + 2] = formedZ + dustDirections[i3 + 2] * localEase * (isMobile ? 0.65 : 1.1);
        }

        position.needsUpdate = true;
      }

      if (pointsMaterial) pointsMaterial.opacity = THREE.MathUtils.lerp(0, isMobile ? 0.76 : 0.95, introEase) * (1 - THREE.MathUtils.clamp((scatter - 0.06) / 0.84, 0, 1));
      if (glowMaterial) glowMaterial.opacity = THREE.MathUtils.lerp(0, isMobile ? 0.05 : 0.1, introEase) * (1 - scatter * 1.35 > 0 ? 1 - scatter * 1.35 : 0);
      if (sparkleMaterial) sparkleMaterial.opacity = THREE.MathUtils.lerp(0, 0.68 + Math.sin(time * 2) * 0.14, introEase) * (1 - THREE.MathUtils.clamp((scatter - 0.1) / 0.82, 0, 1));
      if (linesMaterial) linesMaterial.opacity = THREE.MathUtils.lerp(0, isMobile ? 0.16 : 0.27, introEase) * (1 - scatter * 2.2 > 0 ? 1 - scatter * 2.2 : 0);

      // Intro particles first, breakup particles later.
      if (dustMaterial) {
        const introDust = (1 - introEase) * (isMobile ? 0.35 : 0.5);
        const breakDust = THREE.MathUtils.clamp(scatter * 4, 0, 1) * (1 - THREE.MathUtils.clamp((scatter - 0.84) / 0.16, 0, 1)) * (isMobile ? 0.48 : 0.78);
        dustMaterial.opacity = Math.max(introDust, breakDust);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      cancelAnimationFrame(resizeFrame);

      resizeFrame = requestAnimationFrame(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.innerWidth < 768 ? Math.min(window.devicePixelRatio, 1.1) : Math.min(window.devicePixelRatio, 1.75));

        ScrollTrigger.refresh();
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      destroyed = true;

      cancelAnimationFrame(frameId);
      cancelAnimationFrame(resizeFrame);

      timer.dispose();

      if (!isMobile) {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerleave", handlePointerLeave);
      }

      window.removeEventListener("resize", handleResize);

      scrollTrigger?.kill();

      pointsGeometry?.dispose();
      sparkleGeometry?.dispose();
      dustGeometry?.dispose();
      linesGeometry?.dispose();

      pointsMaterial?.dispose();
      glowMaterial?.dispose();
      sparkleMaterial?.dispose();
      dustMaterial?.dispose();
      linesMaterial?.dispose();

      starTexture?.dispose();

      renderer.dispose();

      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-hidden" />;
}