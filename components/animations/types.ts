export type Point = {
  x: number;
  y: number;
  edge?: number;
  distance?: number;
};

export type ParticlePhase = "SCATTERED" | "FORMING" | "FORMED";
