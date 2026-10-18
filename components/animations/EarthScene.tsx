
"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const EarthScene = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const isSmallMobile = window.matchMedia("(max-width: 480px)").matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      35,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = isMobile ? 6.1 : 5.2;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: "low-power",
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5)
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const segments = isMobile ? 40 : 64;
    const earthGeometry = new THREE.SphereGeometry(
      1.45,
      segments,
      segments
    );

    const earthTexture = new THREE.TextureLoader().load(
      "/texture/earth-texture.png",
      () => renderer.render(scene, camera)
    );

    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = Math.min(
      renderer.capabilities.getMaxAnisotropy(),
      isMobile ? 2 : 4
    );

    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 5,
      specular: new THREE.Color("#17202c"),
    });

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);

    // Keep the atmosphere soft instead of creating a hard blue ring.
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: {
          value: new THREE.Color("#619bc9"),
        },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          float fresnel = 1.0 - max(
            dot(normalize(vNormal), normalize(vViewPosition)),
            0.0
          );

          float intensity = pow(fresnel, 3.5) * 0.32;

          gl_FragColor = vec4(glowColor, intensity);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });

    const atmosphereGeometry = new THREE.SphereGeometry(
      1.49,
      segments,
      segments
    );

    const atmosphere = new THREE.Mesh(
      atmosphereGeometry,
      atmosphereMaterial
    );
    earthGroup.add(atmosphere);

    scene.add(new THREE.AmbientLight("#c4c9d6", 1.35));

    const sunlight = new THREE.DirectionalLight("#ffe4bd", 2.2);
    sunlight.position.set(-3, 2, 4);
    scene.add(sunlight);

    earthGroup.scale.setScalar(isSmallMobile ? 0.62 : isMobile ? 0.72 : 0.88);
    earthGroup.position.set(
      isMobile ? 0.25 : 1.05,
      isMobile ? -0.3 : -0.05,
      0
    );
    earthGroup.rotation.set(0.12, -0.45, -0.08);

    const animationContext = gsap.context(() => {
      if (!prefersReducedMotion) {
        gsap.to(earthGroup.rotation, {
          y: earthGroup.rotation.y + Math.PI * 1.5,
          x: earthGroup.rotation.x + 0.12,
          ease: "none",
          scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "bottom top",
            scrub: 1.5,
          },
        });

        gsap.to(earthGroup.position, {
          x: isMobile ? -0.15 : -0.35,
          y: isMobile ? -0.45 : -0.55,
          ease: "none",
          scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "bottom top",
            scrub: 1.5,
          },
        });
      }
    }, container);

    const render = () => {
      renderer.render(scene, camera);
    };

    // Use GSAP's ticker rather than running a permanent animation loop.
    gsap.ticker.add(render);

    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (!width || !height) return;

      camera.aspect = width / height;
      camera.position.z = window.innerWidth < 768 ? 6.1 : 5.2;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          window.innerWidth < 768 ? 1 : 1.5
        )
      );

      renderer.setSize(width, height);

      earthGroup.scale.setScalar(
        window.innerWidth <= 480
          ? 0.62
          : window.innerWidth < 768
            ? 0.72
            : 0.8
      );

      ScrollTrigger.refresh();
      render();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      gsap.ticker.remove(render);
      animationContext.revert();

      earthGeometry.dispose();
      earthMaterial.dispose();
      earthTexture.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    />
  );
};

export default EarthScene;
