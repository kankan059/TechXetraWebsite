import * as THREE from "three";
import type { Point } from "./types";

export const PARTICLE_COUNT = 35_000;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  attribute vec3 aTarget;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 animated = mix(position, aTarget, uProgress);
    animated += vec3(
      sin(uTime * 0.12 + position.x * 0.6),
      cos(uTime * 0.1 + position.y * 0.5),
      sin(uTime * 0.08 + position.z * 0.4)
    ) * 0.0012;
    vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = clamp(aSize * (15.0 / max(1.0, -mvPosition.z)), 1.0, 2.0);
    vColor = aColor;
    vAlpha = aAlpha;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float edgeFade = 1.0 - smoothstep(0.08, 0.5, length(point));
    float core = 1.0 - smoothstep(0.0, 0.2, length(point));
    gl_FragColor = vec4(vColor + core * 0.16, edgeFade * vAlpha);
  }
`;

type ParticleCloud = {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
};

function seeded(index: number): number {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function gaussian(index: number): number {
  const first = Math.max(0.0001, seeded(index));
  const second = seeded(index + 1.17);
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(Math.PI * 2 * second);
}

function setColor(colors: Float32Array, index: number, color: THREE.Color): void {
  const offset = index * 3;
  colors[offset] = color.r;
  colors[offset + 1] = color.g;
  colors[offset + 2] = color.b;
}

export function createParticleCloud(points: Point[], aspect: number): ParticleCloud {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const targets = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const alphas = new Float32Array(PARTICLE_COUNT);
  const viewportHeight = 2 * Math.tan(THREE.MathUtils.degToRad(42 / 2)) * 8.2;
  const viewportWidth = viewportHeight * aspect;
  const targetCount = Math.min(points.length, Math.floor(PARTICLE_COUNT * 0.76));
  const navy = new THREE.Color("#07102d");
  const purple = new THREE.Color("#352b72");
  const warm = new THREE.Color("#d87965");
  const cyan = new THREE.Color("#7ff5ff");
  const white = new THREE.Color("#f5fdff");

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const offset = index * 3;
    const depth = seeded(index + 31);
    positions[offset] = (seeded(index + 1001) - 0.5) * viewportWidth * 2.5;
    positions[offset + 1] = (seeded(index + 1101) - 0.5) * viewportHeight * 2.5;
    positions[offset + 2] = (seeded(index + 1201) - 0.5) * 8;
    const point = index < targetCount ? points[index] : null;

    if (point) {
      targets[offset] = (point.x - 0.5) * 3.55;
      targets[offset + 1] = (0.5 - point.y) * 4.35;
      targets[offset + 2] = Math.min((point.distance ?? 0) * 0.355, 0.355) * Math.sign(gaussian(index + 91));
      const blend = seeded(index + 401);
      setColor(colors, index, (point.edge ?? 0) > 0.25 ? (blend > 0.7 ? cyan : warm) : (blend > 0.82 ? white : cyan));
      sizes[index] = 0.6 + depth * 1.1;
      alphas[index] = 0.58 + depth * 0.35;
    } else {
      targets[offset] = (seeded(index + 501) - 0.5) * viewportWidth;
      targets[offset + 1] = (seeded(index + 701) - 0.5) * viewportHeight;
      targets[offset + 2] = (seeded(index + 901) - 0.5) * 5;
      const blend = seeded(index + 1001);
      setColor(colors, index, blend > 0.72 ? purple : blend > 0.35 ? navy : white);
      sizes[index] = 0.35 + depth * 0.7;
      alphas[index] = 0.3 + depth * 0.35;
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  geometry.computeBoundingSphere();

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uProgress: { value: 1 } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pointsMesh = new THREE.Points(geometry, material);
  pointsMesh.frustumCulled = false;
  return { points: pointsMesh, geometry, material };
}

export function setParticleLayout(points: THREE.Points, aspect: number): void {
  if (aspect > 1.1) points.position.set(2.1, 0.05, 0);
  else if (aspect > 0.72) points.position.set(0.9, 0.05, 0);
  else points.position.set(0.32, 0.05, 0);
}

export function disposeParticleCloud(cloud: ParticleCloud): void {
  cloud.geometry.dispose();
  cloud.material.dispose();
}
