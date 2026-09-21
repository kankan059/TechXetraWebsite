"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { createScorpioParticleGeometry } from "@/lib/scorpio";

gsap.registerPlugin(ScrollTrigger);

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
  gradient.addColorStop(0.15, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

// Mobile e kom particles use koribo.
function createMobileGeometry(
  source: THREE.BufferGeometry
) {
  const position =
    source.getAttribute(
      "position"
    ) as THREE.BufferAttribute;

  const color =
    source.getAttribute(
      "color"
    ) as THREE.BufferAttribute;

  const positions: number[] = [];
  const colors: number[] = [];

  for (
    let i = 0;
    i < position.count;
    i += 2
  ) {
    positions.push(
      position.getX(i),
      position.getY(i),
      position.getZ(i)
    );

    colors.push(
      color.getX(i),
      color.getY(i),
      color.getZ(i)
    );
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  );

  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      colors,
      3
    )
  );

  return geometry;
}

export default function BackGround() {
  const containerRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) return;

    const isMobile =
      window.innerWidth < 768;

    const scene =
      new THREE.Scene();

    const camera =
      new THREE.PerspectiveCamera(
        55,
        window.innerWidth /
          window.innerHeight,
        0.1,
        100
      );

    camera.position.z = 6.2;

    const renderer =
      new THREE.WebGLRenderer({
        alpha: true,

        // Mobile e antialias off korile FPS better hoi.
        antialias: !isMobile,

        powerPreference:
          "high-performance",
      });

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    // Mobile e 2x DPR onek heavy hoi.
    renderer.setPixelRatio(
      isMobile
        ? Math.min(
            window.devicePixelRatio,
            1.15
          )
        : Math.min(
            window.devicePixelRatio,
            2
          )
    );

    renderer.setClearColor(
      0x070707,
      1
    );

    container.appendChild(
      renderer.domElement
    );

    const particleTexture =
      createParticleTexture();

    // Background stars.
    const starCount =
      isMobile
        ? 650
        : 3200;

    const starPositions =
      new Float32Array(
        starCount * 3
      );

    const starColors =
      new Float32Array(
        starCount * 3
      );

    // Background colors.
    const cyan =
      new THREE.Color(
        "#168eb5"
      );

    const bronze =
      new THREE.Color(
        "#b97946"
      );

    const cream =
      new THREE.Color(
        "#f3ead4"
      );

    for (
      let i = 0;
      i < starCount;
      i++
    ) {
      const index =
        i * 3;

      starPositions[index] =
        (Math.random() -
          0.5) *
        20;

      starPositions[
        index + 1
      ] =
        (Math.random() -
          0.5) *
        14;

      starPositions[
        index + 2
      ] =
        (Math.random() -
          0.5) *
        12;

      const random =
        Math.random();

      const color =
        random > 0.93
          ? bronze
          : random > 0.88
          ? cream
          : cyan;

      starColors[index] =
        color.r;

      starColors[
        index + 1
      ] =
        color.g;

      starColors[
        index + 2
      ] =
        color.b;
    }

    const starsGeometry =
      new THREE.BufferGeometry();

    starsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        starPositions,
        3
      )
    );

    starsGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        starColors,
        3
      )
    );

    const starsMaterial =
      new THREE.PointsMaterial({
        size: isMobile
          ? 0.065
          : 0.092,

        map:
          particleTexture ||
          undefined,

        transparent: true,

        opacity: isMobile
          ? 0.5
          : 0.8,

        vertexColors: true,

        depthWrite: false,

        sizeAttenuation: true,

        blending:
          THREE.AdditiveBlending,
      });

    const stars =
      new THREE.Points(
        starsGeometry,
        starsMaterial
      );

    scene.add(stars);

    const scorpioRoot =
      new THREE.Group();

    const scorpioMouseGroup =
      new THREE.Group();

    scorpioRoot.add(
      scorpioMouseGroup
    );

    scene.add(
      scorpioRoot
    );

    // Mobile e geometry half kori GPU pressure komaisu.
    const originalGeometry =
      createScorpioParticleGeometry();

    const scorpioGeometry =
      isMobile
        ? createMobileGeometry(
            originalGeometry
          )
        : originalGeometry;

    const positionAttribute =
      scorpioGeometry.getAttribute(
        "position"
      ) as THREE.BufferAttribute;

    const originalPositions =
      new Float32Array(
        positionAttribute.array.length
      );

    originalPositions.set(
      positionAttribute.array as Float32Array
    );

    const explodeDirections =
      new Float32Array(
        positionAttribute.array.length
      );

    for (
      let i = 0;
      i <
      explodeDirections.length;
      i += 3
    ) {
      const x =
        originalPositions[i];

      const y =
        originalPositions[
          i + 1
        ];

      const z =
        originalPositions[
          i + 2
        ];

      const length =
        Math.sqrt(
          x * x +
            y * y +
            z * z
        ) || 1;

      explodeDirections[i] =
        x / length +
        (Math.random() -
          0.5) *
          1.8;

      explodeDirections[
        i + 1
      ] =
        y / length +
        (Math.random() -
          0.5) *
          1.8;

      explodeDirections[
        i + 2
      ] =
        z / length +
        (Math.random() -
          0.5) *
          2.8;
    }

    // Scorpio main particles.
    const scorpioMaterial =
      new THREE.PointsMaterial({
        size: isMobile
          ? 0.026
          : 0.055,

        map:
          particleTexture ||
          undefined,

        vertexColors: true,

        transparent: true,

        opacity: isMobile
          ? 0.82
          : 1,

        depthWrite: false,

        sizeAttenuation: true,

        blending:
          THREE.AdditiveBlending,
      });

    const scorpio =
      new THREE.Points(
        scorpioGeometry,
        scorpioMaterial
      );

    scorpioMouseGroup.add(
      scorpio
    );

    // Scorpio glow.
    const glowMaterial =
      new THREE.PointsMaterial({
        size: isMobile
          ? 0.045
          : 0.11,

        map:
          particleTexture ||
          undefined,

        vertexColors: true,

        transparent: true,

        opacity: isMobile
          ? 0.055
          : 0.12,

        depthWrite: false,

        blending:
          THREE.AdditiveBlending,
      });

    const scorpioGlow =
      new THREE.Points(
        scorpioGeometry,
        glowMaterial
      );

    scorpioGlow.position.z =
      -0.12;

    scorpioMouseGroup.add(
      scorpioGlow
    );

    // Front highlight.
    const highlightMaterial =
      new THREE.PointsMaterial({
        size: isMobile
          ? 0.02
          : 0.1,

        map:
          particleTexture ||
          undefined,

        vertexColors: true,

        transparent: true,

        opacity: isMobile
          ? 0.25
          : 0.55,

        depthWrite: false,

        blending:
          THREE.AdditiveBlending,
      });

    const scorpioHighlight =
      new THREE.Points(
        scorpioGeometry,
        highlightMaterial
      );

    scorpioHighlight.position.z =
      0.18;

    scorpioHighlight.scale.setScalar(
      0.99
    );

    scorpioMouseGroup.add(
      scorpioHighlight
    );

    // Mobile e orbit particles kom.
    const orbitCount =
      isMobile
        ? 80
        : 360;

    const orbitPositions =
      new Float32Array(
        orbitCount * 3
      );

    const orbitColors =
      new Float32Array(
        orbitCount * 3
      );

    for (
      let i = 0;
      i < orbitCount;
      i++
    ) {
      const i3 = i * 3;

      const angle =
        (i / orbitCount) *
        Math.PI *
        2;

      const radius =
        2.7 +
        Math.random() *
          0.7;

      orbitPositions[i3] =
        Math.cos(angle) *
        radius;

      orbitPositions[
        i3 + 1
      ] =
        Math.sin(angle) *
        radius *
        0.55;

      orbitPositions[
        i3 + 2
      ] =
        (Math.random() -
          0.5) *
        1.6;

      const color =
        Math.random() >
        0.75
          ? bronze
          : cyan;

      orbitColors[i3] =
        color.r;

      orbitColors[
        i3 + 1
      ] =
        color.g;

      orbitColors[
        i3 + 2
      ] =
        color.b;
    }

    const orbitGeometry =
      new THREE.BufferGeometry();

    orbitGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        orbitPositions,
        3
      )
    );

    orbitGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        orbitColors,
        3
      )
    );

    const orbitMaterial =
      new THREE.PointsMaterial({
        size: isMobile
          ? 0.03
          : 0.045,

        map:
          particleTexture ||
          undefined,

        transparent: true,

        opacity: isMobile
          ? 0.16
          : 0.4,

        vertexColors: true,

        depthWrite: false,

        sizeAttenuation: true,

        blending:
          THREE.AdditiveBlending,
      });

    const orbitParticles =
      new THREE.Points(
        orbitGeometry,
        orbitMaterial
      );

    scorpioMouseGroup.add(
      orbitParticles
    );

    const hitAreaGeometry =
      new THREE.PlaneGeometry(
        5.6,
        5.3
      );

    const hitAreaMaterial =
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });

    const hitArea =
      new THREE.Mesh(
        hitAreaGeometry,
        hitAreaMaterial
      );

    hitArea.position.z =
      -0.2;

    scorpioMouseGroup.add(
      hitArea
    );

    // Scorpio size.
    const getBaseScale =
      () =>
        window.innerWidth <
        768
          ? 0.62
          : 1;

    // Scorpio right left position.
    const getStartX =
      () =>
        window.innerWidth <
        768
          ? 0
          : 2.9;

    // Scorpio up down position.
    const getStartY =
      () =>
        window.innerWidth <
        768
          ? -0.8
          : -0.05;

    const setScorpioPosition =
      () => {
        scorpioRoot.position.set(
          getStartX(),
          getStartY(),
          0
        );

        scorpioRoot.scale.setScalar(
          getBaseScale()
        );
      };

    setScorpioPosition();

    const pointer =
      new THREE.Vector2();

    const smoothPointer =
      new THREE.Vector2();

    const raycaster =
      new THREE.Raycaster();

    let hoverTarget = 0;
    let hoverValue = 0;
    let touchBoost = 0;

    const scrollState = {
      scatter: 0,
      progress: 0,
    };

    const updatePointer = (
      clientX: number,
      clientY: number
    ) => {
      pointer.x =
        (clientX /
          window.innerWidth) *
          2 -
        1;

      pointer.y =
        -(
          clientY /
          window.innerHeight
        ) *
          2 +
        1;
    };

    const checkHover =
      () => {
        if (
          isMobile ||
          scrollState.scatter >
            0.65
        ) {
          hoverTarget = 0;

          return;
        }

        raycaster.setFromCamera(
          pointer,
          camera
        );

        const intersections =
          raycaster.intersectObject(
            hitArea,
            false
          );

        hoverTarget =
          intersections.length >
          0
            ? 1
            : 0;
      };

    const handlePointerMove =
      (
        event: PointerEvent
      ) => {
        if (isMobile)
          return;

        updatePointer(
          event.clientX,
          event.clientY
        );

        checkHover();
      };

    const handlePointerDown =
      (
        event: PointerEvent
      ) => {
        if (isMobile)
          return;

        updatePointer(
          event.clientX,
          event.clientY
        );

        checkHover();

        if (
          hoverTarget > 0
        ) {
          touchBoost = 1;
        }
      };

    const handlePointerLeave =
      () => {
        hoverTarget = 0;
      };

    // Mobile scroll e pointer calculation dorkar nai.
    if (!isMobile) {
      window.addEventListener(
        "pointermove",
        handlePointerMove
      );

      window.addEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.addEventListener(
        "mouseleave",
        handlePointerLeave
      );
    }

    const hero =
      document.querySelector(
        "#hero"
      );

    let scrollTrigger:
      | ScrollTrigger
      | undefined;

    if (hero) {
      scrollTrigger =
        ScrollTrigger.create({
          trigger: hero,

          start: "top top",

          end: "bottom top",

          // Mobile scroll motion ektu smooth hobo.
          scrub: isMobile
            ? 0.55
            : true,

          onUpdate: (
            self
          ) => {
            const progress =
              self.progress;

            scrollState.progress =
              progress;

            scrollState.scatter =
              THREE.MathUtils.clamp(
                (
                  progress -
                  0.25
                ) /
                  0.65,
                0,
                1
              );

            const startX =
              getStartX();

            const startY =
              getStartY();

            scorpioRoot.position.x =
              startX +
              progress *
                (isMobile
                  ? 0.25
                  : 0.9);

            scorpioRoot.position.y =
              startY -
              progress *
                (isMobile
                  ? 0.65
                  : 1.3);

            scorpioRoot.position.z =
              -progress *
              (isMobile
                ? 1.1
                : 2);

            scorpioRoot.rotation.z =
              progress *
              (isMobile
                ? 0.08
                : 0.25);

            scorpioRoot.rotation.y =
              progress *
              (isMobile
                ? 0.1
                : 0.42);

            const scale =
              getBaseScale() *
              (
                1 -
                progress *
                  (isMobile
                    ? 0.22
                    : 0.35)
              );

            scorpioRoot.scale.setScalar(
              scale
            );

            scorpioMaterial.opacity =
              Math.max(
                0,
                (
                  isMobile
                    ? 0.82
                    : 1
                ) -
                  scrollState.scatter *
                    1.15
              );

            glowMaterial.opacity =
              Math.max(
                0,
                (
                  isMobile
                    ? 0.055
                    : 0.12
                ) -
                  scrollState.scatter *
                    0.12
              );

            highlightMaterial.opacity =
              Math.max(
                0,
                (
                  isMobile
                    ? 0.25
                    : 0.55
                ) -
                  scrollState.scatter *
                    0.7
              );

            orbitMaterial.opacity =
              Math.max(
                0,
                (
                  isMobile
                    ? 0.16
                    : 0.4
                ) -
                  scrollState.scatter *
                    0.45
              );
          },
        });
    }

    const clock =
      new THREE.Clock();

    let frameId = 0;

    const animate =
      () => {
        const time =
          clock.getElapsedTime();

        if (!isMobile) {
          smoothPointer.x +=
            (
              pointer.x -
              smoothPointer.x
            ) *
            0.015;

          smoothPointer.y +=
            (
              pointer.y -
              smoothPointer.y
            ) *
            0.015;

          hoverValue +=
            (
              hoverTarget -
              hoverValue
            ) *
            0.08;

          touchBoost *=
            0.9;
        }

        const interaction =
          isMobile
            ? 0
            : Math.min(
                1.4,
                hoverValue +
                  touchBoost *
                    0.7
              );

        const hoverScale =
          1 +
          interaction *
            0.13;

        scorpioMouseGroup.scale.setScalar(
          hoverScale
        );

        // Desktop hover only.
        scorpioMouseGroup.rotation.y =
          isMobile
            ? 0
            : smoothPointer.x *
              0.096 *
              interaction;

        scorpioMouseGroup.rotation.x =
          isMobile
            ? 0
            : -smoothPointer.y *
              0.091 *
              interaction;

        // Mobile e khub halka floating.
        scorpioMouseGroup.rotation.z =
          isMobile
            ? Math.sin(
                time * 0.22
              ) *
              0.003
            : Math.sin(
                time * 0.15
              ) *
                0.012 +
              Math.sin(
                time * 4
              ) *
                0.025 *
                interaction;

        scorpioMouseGroup.position.x =
          isMobile
            ? 0
            : smoothPointer.x *
              0.12 *
              interaction;

        scorpioMouseGroup.position.y =
          isMobile
            ? Math.sin(
                time * 0.35
              ) *
              0.012
            : Math.sin(
                time * 0.8
              ) *
                0.05 +
              smoothPointer.y *
                0.09 *
                interaction;

        scorpioMouseGroup.position.z =
          isMobile
            ? 0
            : interaction *
              0.22;

        // Orbit animation mobile e slow.
        orbitParticles.rotation.z =
          time *
          (isMobile
            ? 0.035
            : 0.15);

        orbitParticles.rotation.y =
          time *
            (isMobile
              ? 0.018
              : 0.08) +
          interaction *
            0.35;

        const positions =
          positionAttribute.array as Float32Array;

        const scatter =
          scrollState.scatter;

        const scatterEase =
          scatter *
          scatter;

        for (
          let i = 0;
          i <
          positions.length;
          i += 3
        ) {
          const ox =
            originalPositions[
              i
            ];

          const oy =
            originalPositions[
              i + 1
            ];

          const oz =
            originalPositions[
              i + 2
            ];

          // Mobile e particle breathing kom.
          const wave =
            Math.sin(
              time *
                (isMobile
                  ? 0.55
                  : 1.2) +
                ox * 2 +
                oy
            ) *
            (isMobile
              ? 0.004
              : 0.012);

          const hoverWave =
            isMobile
              ? 0
              : Math.sin(
                  time *
                    4 +
                    ox *
                      3 +
                    oy *
                      2
                ) *
                0.018 *
                interaction;

          const depthPulse =
            Math.cos(
              time *
                (isMobile
                  ? 0.8
                  : 1.8) +
                oz * 3
            ) *
            (isMobile
              ? 0.003
              : 0.01) *
            (
              1 +
              interaction *
                0.7
            );

          positions[i] =
            ox +
            wave +
            hoverWave +
            explodeDirections[
              i
            ] *
              scatterEase *
              (isMobile
                ? 1.9
                : 2.6);

          positions[
            i + 1
          ] =
            oy +
            wave +
            hoverWave +
            explodeDirections[
              i + 1
            ] *
              scatterEase *
              (isMobile
                ? 1.9
                : 2.6);

          positions[
            i + 2
          ] =
            oz +
            depthPulse +
            hoverWave *
              2 +
            explodeDirections[
              i + 2
            ] *
              scatterEase *
              (isMobile
                ? 1.4
                : 2) +
            Math.sin(
              time +
                i *
                  0.001
            ) *
              scatter *
              (isMobile
                ? 0.025
                : 0.08);
        }

        positionAttribute.needsUpdate =
          true;

        // Mobile e background movement almost static.
        stars.rotation.y =
          time *
          (isMobile
            ? 0.0015
            : 0.005);

        stars.rotation.x =
          Math.sin(
            time *
              (isMobile
                ? 0.06
                : 0.12)
          ) *
          (isMobile
            ? 0.006
            : 0.018);

        renderer.render(
          scene,
          camera
        );

        frameId =
          requestAnimationFrame(
            animate
          );
      };

    animate();

    let lastWidth =
      window.innerWidth;

    const handleResize =
      () => {
        const newWidth =
          window.innerWidth;

        camera.aspect =
          window.innerWidth /
          window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
          window.innerWidth,
          window.innerHeight
        );

        renderer.setPixelRatio(
          isMobile
            ? Math.min(
                window.devicePixelRatio,
                1.15
              )
            : Math.min(
                window.devicePixelRatio,
                2
              )
        );

        // Mobile browser top bar height change hole Scorpio jump nokoribo.
        if (
          Math.abs(
            newWidth -
              lastWidth
          ) >
          2
        ) {
          lastWidth =
            newWidth;

          setScorpioPosition();

          ScrollTrigger.refresh();
        }
      };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      cancelAnimationFrame(
        frameId
      );

      if (!isMobile) {
        window.removeEventListener(
          "pointermove",
          handlePointerMove
        );

        window.removeEventListener(
          "pointerdown",
          handlePointerDown
        );

        document.removeEventListener(
          "mouseleave",
          handlePointerLeave
        );
      }

      window.removeEventListener(
        "resize",
        handleResize
      );

      scrollTrigger?.kill();

      starsGeometry.dispose();

      starsMaterial.dispose();

      scorpioGeometry.dispose();

      if (
        isMobile &&
        originalGeometry !==
          scorpioGeometry
      ) {
        originalGeometry.dispose();
      }

      scorpioMaterial.dispose();

      glowMaterial.dispose();

      highlightMaterial.dispose();

      orbitGeometry.dispose();

      orbitMaterial.dispose();

      hitAreaGeometry.dispose();

      hitAreaMaterial.dispose();

      particleTexture?.dispose();

      renderer.dispose();

      if (
        renderer.domElement
          .parentNode
      ) {
        renderer.domElement.parentNode.removeChild(
          renderer.domElement
        );
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen bg-[#070707]"
    />
  );
}