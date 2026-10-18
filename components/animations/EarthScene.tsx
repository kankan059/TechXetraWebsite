
"use client";

import { useEffect, useRef } from "react";
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

    const hero = container.closest("#hero");
    if (!hero) return;

    const scene = new THREE.Scene();

    const getSize = () => ({
      width: container.clientWidth,
      height: container.clientHeight,
    });

    const initialSize = getSize();
    if (!initialSize.width || !initialSize.height) return;

    const camera = new THREE.PerspectiveCamera(
      35,
      initialSize.width / initialSize.height,
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
      Math.min(window.devicePixelRatio || 1, isMobile ? 0.8 : 1.25)
    );
    renderer.setSize(initialSize.width, initialSize.height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const segments = isMobile ? 32 : 64;

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
      isMobile ? 1 : 4
    );

    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 5,
      specular: new THREE.Color("#17202c"),
    });

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);

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

    const baseRotationX = 0.12;
    const baseRotationY = -0.45;
    const baseRotationZ = -0.08;

    earthGroup.scale.setScalar(
      isSmallMobile ? 0.62 : isMobile ? 0.72 : 0.88
    );

    earthGroup.position.set(
      isMobile ? 0.25 : 1.05,
      isMobile ? -0.3 : -0.05,
      0
    );

    earthGroup.rotation.set(
      baseRotationX,
      baseRotationY,
      baseRotationZ
    );

    // Mobile rotates a little faster, but never animates with page scroll.
    const rotationSpeed = isMobile ? 0.045 : 0.025;
    let elapsed = 0;

    // Only desktop gets scroll-linked animation.
    const animationContext = gsap.context(() => {
      if (isMobile || prefersReducedMotion) return;

      gsap.to(earthGroup.rotation, {
        y: baseRotationY + Math.PI * 1.5,
        x: baseRotationX + 0.12,
        ease: "none",
        scrollTrigger: {
          id: "TECHXTRA-EARTH-ROTATION",
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
          invalidateOnRefresh: true,
        },
      });

      gsap.to(earthGroup.position, {
        x: -0.35,
        y: -0.55,
        ease: "none",
        scrollTrigger: {
          id: "TECHXTRA-EARTH-POSITION",
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
          invalidateOnRefresh: true,
        },
      });
    }, container);

    const render = (_time: number, deltaTime: number) => {
      if (!prefersReducedMotion) {
        elapsed += Math.min(deltaTime, 50) / 1000;

        // Mobile auto-rotation; desktop also rotates when not scrolling.
        // Desktop scroll tweens may also control this rotation.
        if (isMobile) {
          earthGroup.rotation.y +=
            rotationSpeed * (Math.min(deltaTime, 50) / 1000);
        } else {
          earthGroup.rotation.y +=
            rotationSpeed * (Math.min(deltaTime, 50) / 1000);
        }
      }

      renderer.render(scene, camera);
    };

    // Avoid running an animation loop for reduced-motion users.
    if (!prefersReducedMotion) {
      gsap.ticker.add(render);
    } else {
      renderer.render(scene, camera);
    }

    const handleResize = () => {
      const { width, height } = getSize();
      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          isMobile ? 0.8 : 1.25
        )
      );
      renderer.setSize(width, height);

      earthGroup.scale.setScalar(
        window.innerWidth <= 480
          ? 0.62
          : window.innerWidth < 768
            ? 0.72
            : 0.88
      );

      if (isMobile || prefersReducedMotion) {
        renderer.render(scene, camera);
      } else {
        ScrollTrigger.refresh();
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    renderer.render(scene, camera);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();

      if (!prefersReducedMotion) {
        gsap.ticker.remove(render);
      }

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
