import * as THREE from "three";

const BLUE = new THREE.Color("#0f6f98");
const CYAN = new THREE.Color("#39d5e8");
const BRONZE = new THREE.Color("#b97946");
const CREAM = new THREE.Color("#f3ead4");

function addParticle(
  positions: number[],
  colors: number[],
  x: number,
  y: number,
  z = 0,
  spread = 0.06,
  depth = 0.22
) {
  positions.push(
    x + (Math.random() - 0.5) * spread,
    y + (Math.random() - 0.5) * spread,
    z + (Math.random() - 0.5) * depth
  );

  const random = Math.random();

  let color: THREE.Color;

  if (random > 0.92) {
    color = CREAM;
  } else if (random > 0.78) {
    color = BRONZE;
  } else if (random > 0.44) {
    color = CYAN;
  } else {
    color = BLUE;
  }

  colors.push(color.r, color.g, color.b);
}

function addFilledEllipse(
  positions: number[],
  colors: number[],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  amount: number,
  depth = 0.24
) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random());

    const x = cx + Math.cos(angle) * rx * radius;
    const y = cy + Math.sin(angle) * ry * radius;

    addParticle(
      positions,
      colors,
      x,
      y,
      (Math.random() - 0.5) * depth,
      0.04,
      depth
    );
  }
}

function addCurve(
  positions: number[],
  colors: number[],
  points: THREE.Vector3[],
  amount = 100,
  thickness = 4,
  spread = 0.08,
  depth = 0.18
) {
  const curve = new THREE.CatmullRomCurve3(
    points,
    false,
    "catmullrom",
    0.2
  );

  const curvePoints = curve.getPoints(amount);

  curvePoints.forEach((point) => {
    for (let i = 0; i < thickness; i++) {
      addParticle(
        positions,
        colors,
        point.x,
        point.y,
        point.z,
        spread,
        depth
      );
    }
  });
}

export function createScorpioParticleGeometry() {
  const positions: number[] = [];
  const colors: number[] = [];

  addFilledEllipse(
    positions,
    colors,
    0,
    -0.2,
    0.58,
    0.95,
    1500,
    0.38
  );

  addFilledEllipse(
    positions,
    colors,
    0,
    0.75,
    0.48,
    0.4,
    600,
    0.32
  );

  const bodySegments = [
    [0, 0.25, 0.5, 0.1],
    [0, 0, 0.54, 0.1],
    [0, -0.28, 0.5, 0.1],
    [0, -0.55, 0.43, 0.09],
  ];

  bodySegments.forEach(([x, y, rx, ry]) => {
    addFilledEllipse(
      positions,
      colors,
      x,
      y,
      rx,
      ry,
      130,
      0.18
    );
  });

  addCurve(
    positions,
    colors,
    [
      new THREE.Vector3(-0.35, 0.72, 0),
      new THREE.Vector3(-0.8, 0.95, 0.05),
      new THREE.Vector3(-1.2, 1.3, 0.08),
      new THREE.Vector3(-1.65, 1.5, 0.12),
    ],
    140,
    5,
    0.07,
    0.18
  );

  addCurve(
    positions,
    colors,
    [
      new THREE.Vector3(0.35, 0.72, 0),
      new THREE.Vector3(0.8, 0.95, -0.05),
      new THREE.Vector3(1.2, 1.3, -0.08),
      new THREE.Vector3(1.65, 1.5, -0.12),
    ],
    140,
    5,
    0.07,
    0.18
  );

  addFilledEllipse(
    positions,
    colors,
    -1.8,
    1.52,
    0.38,
    0.2,
    350,
    0.2
  );

  addCurve(
    positions,
    colors,
    [
      new THREE.Vector3(-1.75, 1.55, 0.04),
      new THREE.Vector3(-2.05, 1.88, 0.08),
      new THREE.Vector3(-2.3, 1.7, 0.16),
    ],
    80,
    5,
    0.08,
    0.16
  );

  addCurve(
    positions,
    colors,
    [
      new THREE.Vector3(-1.7, 1.48, -0.04),
      new THREE.Vector3(-2.02, 1.22, -0.08),
      new THREE.Vector3(-2.28, 1.4, -0.16),
    ],
    80,
    5,
    0.08,
    0.16
  );

  addFilledEllipse(
    positions,
    colors,
    1.8,
    1.52,
    0.38,
    0.2,
    350,
    0.2
  );

  addCurve(
    positions,
    colors,
    [
      new THREE.Vector3(1.75, 1.55, -0.04),
      new THREE.Vector3(2.05, 1.88, -0.08),
      new THREE.Vector3(2.3, 1.7, -0.16),
    ],
    80,
    5,
    0.08,
    0.16
  );

  addCurve(
    positions,
    colors,
    [
      new THREE.Vector3(1.7, 1.48, 0.04),
      new THREE.Vector3(2.02, 1.22, 0.08),
      new THREE.Vector3(2.28, 1.4, 0.16),
    ],
    80,
    5,
    0.08,
    0.16
  );

  const leftLegs = [
    [
      new THREE.Vector3(-0.38, 0.42, 0.03),
      new THREE.Vector3(-0.85, 0.2, 0.08),
      new THREE.Vector3(-1.4, 0.35, 0.12),
    ],
    [
      new THREE.Vector3(-0.48, 0.12, 0.02),
      new THREE.Vector3(-1, -0.12, 0.06),
      new THREE.Vector3(-1.55, -0.05, 0.1),
    ],
    [
      new THREE.Vector3(-0.48, -0.2, -0.02),
      new THREE.Vector3(-0.95, -0.52, -0.06),
      new THREE.Vector3(-1.48, -0.55, -0.1),
    ],
    [
      new THREE.Vector3(-0.38, -0.5, -0.03),
      new THREE.Vector3(-0.82, -0.88, -0.08),
      new THREE.Vector3(-1.32, -1.02, -0.12),
    ],
  ];

  leftLegs.forEach((leg) => {
    addCurve(
      positions,
      colors,
      leg,
      100,
      4,
      0.06,
      0.14
    );

    const mirrored = leg.map(
      (point) =>
        new THREE.Vector3(
          -point.x,
          point.y,
          -point.z
        )
    );

    addCurve(
      positions,
      colors,
      mirrored,
      100,
      4,
      0.06,
      0.14
    );
  });

  addCurve(
    positions,
    colors,
    [
      new THREE.Vector3(0, -1.05, 0),
      new THREE.Vector3(0.25, -1.42, 0.08),
      new THREE.Vector3(0.75, -1.7, 0.16),
      new THREE.Vector3(1.25, -1.62, 0.2),
      new THREE.Vector3(1.65, -1.28, 0.16),
      new THREE.Vector3(1.82, -0.78, 0.06),
      new THREE.Vector3(1.7, -0.25, -0.02),
      new THREE.Vector3(1.4, 0.18, -0.08),
      new THREE.Vector3(1.12, 0.45, -0.12),
    ],
    380,
    8,
    0.07,
    0.16
  );

  addCurve(
    positions,
    colors,
    [
      new THREE.Vector3(1.12, 0.45, -0.12),
      new THREE.Vector3(0.92, 0.7, -0.05),
      new THREE.Vector3(0.9, 1, 0.05),
      new THREE.Vector3(1.05, 1.2, 0.16),
      new THREE.Vector3(1.22, 1.02, 0.08),
    ],
    140,
    6,
    0.06,
    0.14
  );

  for (let i = 0; i < 450; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 1.8;

    addParticle(
      positions,
      colors,
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      (Math.random() - 0.5) * 2.6,
      0.05,
      0.22
    );
  }

  const geometry = new THREE.BufferGeometry();

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