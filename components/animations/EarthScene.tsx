"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const EARTH_POSITION = {
  desktopX: 0,
  mobileX: 0,
  tabletX: 0,

  desktopLift: 0.24,
  mobileLift: 1,
  tallMobileLift: 1.25,
  tabletLift: 0.65,
  tallTabletLift: 0.9,

  desktopScale: 1.0,
  mobileScale: 0.72,
  smallMobileScale: 0.62,
  tallMobileScale: 0.64,
  tabletScale: 0.82,
  tallTabletScale: 0.78,

  riseDistance: 2.0,
  scrollRotation: Math.PI * 1.5,

  desktopRotationSpeed: 0.2,
  mobileRotationSpeed: 0.045,
};

const EarthScene = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const hero =
      container.closest<HTMLElement>("#hero") ??
      document.querySelector<HTMLElement>("#hero");

    if (!hero) return;

    const isMobile = window.matchMedia(
      "(max-width: 767px)"
    ).matches;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const FOV = 35;
    const CAMERA_Z = isMobile ? 6.1 : 5.2;

    const scene = new THREE.Scene();

    const getSize = () => ({
      width: container.clientWidth,
      height: container.clientHeight,
    });

    const initialSize = getSize();
    if (!initialSize.width || !initialSize.height) return;

    const camera = new THREE.PerspectiveCamera(
      FOV,
      initialSize.width / initialSize.height,
      0.1,
      100
    );

    camera.position.z = CAMERA_Z;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: "low-power",
    });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        isMobile ? 1 : 1.25
      )
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

    earthGroup.add(
      new THREE.Mesh(earthGeometry, earthMaterial)
    );

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
            dot(
              normalize(vNormal),
              normalize(vViewPosition)
            ),
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

    earthGroup.add(
      new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
    );

    scene.add(new THREE.AmbientLight("#c4c9d6", 1.35));

    const sunlight = new THREE.DirectionalLight("#ffe4bd", 2.2);
    sunlight.position.set(-3, 2, 4);
    scene.add(sunlight);

    const baseRotationX = 0.12;
    const baseRotationY = -0.45;
    const baseRotationZ = -0.08;

    // Responsive Earth scale for phones, tablets and desktops.
    const getEarthScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (width <= 480) {
        // Preserve the smaller phone's existing look.
        return height >= 800
          ? EARTH_POSITION.smallMobileScale
          : EARTH_POSITION.smallMobileScale;
      }

      if (width < 600) {
        return height >= 800
          ? EARTH_POSITION.tallMobileScale
          : EARTH_POSITION.mobileScale;
      }

      if (width < 768) {
        return height >= 800
          ? EARTH_POSITION.tallMobileScale
          : EARTH_POSITION.mobileScale;
      }

      if (width <= 1024) {
        return height >= 900
          ? EARTH_POSITION.tallTabletScale
          : EARTH_POSITION.tabletScale;
      }

      return EARTH_POSITION.desktopScale;
    };

    // Responsive Earth position based on viewport dimensions.
    const getBottomPosition = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const visibleHalfHeight =
        CAMERA_Z *
        Math.tan(THREE.MathUtils.degToRad(FOV / 2));

      let lift = EARTH_POSITION.desktopLift;
      let x = EARTH_POSITION.desktopX;

      if (width <= 480) {
        lift =
          height >= 800
            ? EARTH_POSITION.mobileLift
            : EARTH_POSITION.mobileLift;

        x = EARTH_POSITION.mobileX;
      } else if (width < 768) {
        lift =
          height >= 800
            ? EARTH_POSITION.tallMobileLift
            : EARTH_POSITION.mobileLift;

        x = EARTH_POSITION.mobileX;
      } else if (width <= 1024) {
        lift =
          height >= 900
            ? EARTH_POSITION.tallTabletLift
            : EARTH_POSITION.tabletLift;

        x = EARTH_POSITION.tabletX;
      }

      return {
        x,
        y: -visibleHalfHeight + lift,
      };
    };

    const startPosition = getBottomPosition();

    earthGroup.position.set(
      startPosition.x,
      startPosition.y,
      0
    );

    earthGroup.scale.setScalar(getEarthScale());

    earthGroup.rotation.set(
      baseRotationX,
      baseRotationY,
      baseRotationZ
    );

    let elapsed = 0;
    let scrollRotationY = 0;
    let scrollRotationX = 0;
    let disposed = false;
    let isVisible = !isMobile;

    // Runs continuously while visible, even when not scrolling.
    const render = (_time: number, deltaTime: number) => {
      if (disposed || !isVisible) return;

      const delta = Math.min(deltaTime, 50) / 1000;

      // Keep continuous desktop rotation.
      if (!isMobile) {
        elapsed += delta;

        earthGroup.rotation.y =
          baseRotationY +
          elapsed * EARTH_POSITION.desktopRotationSpeed +
          scrollRotationY;

        earthGroup.rotation.x =
          baseRotationX + scrollRotationX;
      } else if (!prefersReducedMotion) {
        elapsed += delta;

        earthGroup.rotation.y =
          baseRotationY +
          elapsed * EARTH_POSITION.mobileRotationSpeed;
      }

      renderer.render(scene, camera);
    };

    const startRendering = () => {
      if (disposed || isVisible) return;

      isVisible = true;

      if (!prefersReducedMotion || !isMobile) {
        gsap.ticker.add(render);
      }

      renderer.render(scene, camera);
    };

    const stopRendering = () => {
      if (!isVisible) return;

      isVisible = false;
      gsap.ticker.remove(render);
    };

    let observer: IntersectionObserver | null = null;

    if (isMobile) {
      container.style.opacity = "0";

      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            startRendering();

            gsap.to(container, {
              opacity: 1,
              duration: 0.45,
              ease: "power1.out",
              overwrite: true,
            });
          } else {
            gsap.to(container, {
              opacity: 0,
              duration: 0.2,
              overwrite: true,
              onComplete: stopRendering,
            });
          }
        },
        { threshold: 0.01 }
      );

      observer.observe(hero);
    } else {
      // Start the desktop animation loop immediately.
      gsap.ticker.add(render);
    }

    const animationContext = gsap.context(() => {
      if (isMobile || prefersReducedMotion) return;

      // Rise upward as the Hero scrolls away.
      gsap.to(earthGroup.position, {
        y: startPosition.y + EARTH_POSITION.riseDistance,
        ease: "none",

        scrollTrigger: {
          id: "TECHXETRA-EARTH-RISE",
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      // Scroll adds rotation without overriding continuous rotation.
      const scrollRotation = { progress: 0 };

      gsap.to(scrollRotation, {
        progress: 1,
        ease: "none",

        onUpdate: () => {
          scrollRotationY =
            scrollRotation.progress *
            EARTH_POSITION.scrollRotation;

          scrollRotationX =
            scrollRotation.progress * 0.12;
        },

        scrollTrigger: {
          id: "TECHXETRA-EARTH-ROTATION",
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, container);

    const handleResize = () => {
      const { width, height } = getSize();
      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          window.innerWidth < 768 ? 1 : 1.25
        )
      );

      renderer.setSize(width, height);

      const responsivePosition = getBottomPosition();

      earthGroup.scale.setScalar(getEarthScale());

      if (isMobile) {
        earthGroup.position.x = responsivePosition.x;
        earthGroup.position.y = responsivePosition.y;
      }

      if (isVisible) {
        renderer.render(scene, camera);
      }

      if (!isMobile && !prefersReducedMotion) {
        ScrollTrigger.refresh();
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);

    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    renderer.render(scene, camera);

    return () => {
      disposed = true;

      observer?.disconnect();
      resizeObserver.disconnect();

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