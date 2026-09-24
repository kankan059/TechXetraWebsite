import * as THREE from "three";

const DARK_BLUE = new THREE.Color("#052A3B");
const BLUE = new THREE.Color("#0972AE");
const CYAN = new THREE.Color("#39D5E8");
const LIGHT_CYAN = new THREE.Color("#9AF4FF");
const CREAM = new THREE.Color("#F7F3DE");
const BRONZE = new THREE.Color("#B97946");

export type ScorpioGeometryPack = {
    body: THREE.BufferGeometry;
    details: THREE.BufferGeometry;
    nodes: THREE.BufferGeometry;
    lines: THREE.BufferGeometry;
    dust: THREE.BufferGeometry;
};

type PointStore = {
    positions: number[];
    colors: number[];
};

type XY = [number, number];

function bodyColor() {
    const random = Math.random();

    if (random > 0.975) return CREAM;
    if (random > 0.91) return LIGHT_CYAN;
    if (random > 0.6) return CYAN;
    if (random > 0.2) return BLUE;

    return DARK_BLUE;
}

function detailColor() {
    const random = Math.random();

    if (random > 0.88) return CREAM;
    if (random > 0.68) return LIGHT_CYAN;
    if (random > 0.58) return BRONZE;

    return CYAN;
}

function pushParticle(store: PointStore, x: number, y: number, z: number, color: THREE.Color, spread = 0.025, depth = 0.08) {
    store.positions.push(
        x + (Math.random() - 0.5) * spread,
        y + (Math.random() - 0.5) * spread,
        z + (Math.random() - 0.5) * depth
    );

    store.colors.push(color.r, color.g, color.b);
}

function addRotatedEllipse(
    store: PointStore,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rotation: number,
    count: number,
    depth = 0.1,
    detail = false
) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random());

        const lx = Math.cos(angle) * rx * radius;
        const ly = Math.sin(angle) * ry * radius;

        const x = cx + lx * cos - ly * sin;
        const y = cy + lx * sin + ly * cos;

        pushParticle(store, x, y, 0, detail ? detailColor() : bodyColor(), 0.025, depth);
    }
}

function addEllipse(store: PointStore, cx: number, cy: number, rx: number, ry: number, count: number, depth = 0.1, detail = false) {
    addRotatedEllipse(store, cx, cy, rx, ry, 0, count, depth, detail);
}

function addCurve(
    store: PointStore,
    points: THREE.Vector3[],
    samples = 80,
    thickness = 4,
    detail = false,
    spread = 0.025,
    depth = 0.06
) {
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.12);
    const curvePoints = curve.getPoints(samples);

    curvePoints.forEach((point) => {
        for (let i = 0; i < thickness; i++) {
            pushParticle(store, point.x, point.y, point.z, detail ? detailColor() : bodyColor(), spread, depth);
        }
    });
}

function pointInsidePolygon(x: number, y: number, polygon: XY[]) {
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.000001) + xi;

        if (intersects) inside = !inside;
    }

    return inside;
}

function addPolygon(store: PointStore, polygon: XY[], count: number, depth = 0.1, detail = false) {
    const xs = polygon.map((point) => point[0]);
    const ys = polygon.map((point) => point[1]);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    let added = 0;
    let attempts = 0;

    while (added < count && attempts < count * 40) {
        attempts++;

        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);

        if (!pointInsidePolygon(x, y, polygon)) continue;

        pushParticle(store, x, y, 0, detail ? detailColor() : bodyColor(), 0.022, depth);
        added++;
    }
}

function addOutline(store: PointStore, polygon: XY[], thickness = 3) {
    const vectors = polygon.map(([x, y]) => new THREE.Vector3(x, y, 0.04));
    vectors.push(vectors[0].clone());

    for (let i = 0; i < vectors.length - 1; i++) {
        addCurve(store, [vectors[i], vectors[i + 1]], 24, thickness, true, 0.012, 0.025);
    }
}

function addNode(store: PointStore, x: number, y: number, z = 0.06, radius = 0.055, count = 14) {
    pushParticle(store, x, y, z, CREAM, 0.004, 0.01);

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;

        const color = Math.random() > 0.22 ? LIGHT_CYAN : CREAM;

        pushParticle(
            store,
            x + Math.cos(angle) * distance,
            y + Math.sin(angle) * distance,
            z,
            color,
            0.009,
            0.018
        );
    }
}

function addLine(lines: number[], a: THREE.Vector3, b: THREE.Vector3) {
    lines.push(a.x, a.y, a.z, b.x, b.y, b.z);
}

function createPointGeometry(store: PointStore) {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(store.positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(store.colors, 3));

    return geometry;
}

function mirrorPolygon(points: XY[], side: -1 | 1): XY[] {
    return points.map(([x, y]) => [x * side, y]);
}

function addClaw(
    body: PointStore,
    details: PointStore,
    nodes: PointStore,
    lines: number[],
    side: -1 | 1
) {
    const s = side;

    // Thick pedipalp arm.
    addCurve(
        body,
        [
            new THREE.Vector3(s * 0.48, 0.78, 0),
            new THREE.Vector3(s * 0.72, 1.08, 0.02),
            new THREE.Vector3(s * 0.98, 1.35, 0.03),
            new THREE.Vector3(s * 1.24, 1.55, 0.03),
        ],
        100,
        9,
        false,
        0.035,
        0.09
    );

    addEllipse(body, s * 0.76, 1.08, 0.2, 0.19, 90, 0.1);
    addEllipse(body, s * 1.08, 1.42, 0.25, 0.21, 110, 0.1);

    // Broad claw palm.
    addRotatedEllipse(body, s * 1.48, 1.7, 0.48, 0.35, s * 0.16, 320, 0.13);

    const upperFinger = mirrorPolygon(
        [
            [1.3, 1.72],
            [1.5, 1.98],
            [1.8, 2.18],
            [2.08, 2.24],
            [2.28, 2.14],
            [2.06, 2.06],
            [1.82, 1.96],
            [1.58, 1.76],
        ],
        side
    );

    const lowerFinger = mirrorPolygon(
        [
            [1.28, 1.54],
            [1.54, 1.38],
            [1.82, 1.28],
            [2.08, 1.29],
            [2.28, 1.41],
            [2.08, 1.46],
            [1.84, 1.5],
            [1.58, 1.64],
        ],
        side
    );

    addPolygon(body, upperFinger, 260, 0.1);
    addPolygon(body, lowerFinger, 250, 0.1);

    addOutline(details, upperFinger, 2);
    addOutline(details, lowerFinger, 2);

    // Inner pincer edges.
    addCurve(
        details,
        [
            new THREE.Vector3(s * 1.58, 1.82, 0.05),
            new THREE.Vector3(s * 1.9, 2.01, 0.05),
            new THREE.Vector3(s * 2.24, 2.12, 0.05),
        ],
        54,
        2,
        true,
        0.012,
        0.02
    );

    addCurve(
        details,
        [
            new THREE.Vector3(s * 1.58, 1.61, 0.05),
            new THREE.Vector3(s * 1.9, 1.46, 0.05),
            new THREE.Vector3(s * 2.22, 1.43, 0.05),
        ],
        54,
        2,
        true,
        0.012,
        0.02
    );

    const anchors = [
        new THREE.Vector3(s * 0.5, 0.8, 0.07),
        new THREE.Vector3(s * 0.78, 1.12, 0.07),
        new THREE.Vector3(s * 1.08, 1.42, 0.07),
        new THREE.Vector3(s * 1.5, 1.7, 0.07),
        new THREE.Vector3(s * 1.88, 2.08, 0.07),
        new THREE.Vector3(s * 2.3, 2.2, 0.07),
        new THREE.Vector3(s * 1.9, 1.45, 0.07),
        new THREE.Vector3(s * 2.28, 1.43, 0.07),
    ];

    anchors.forEach((point, index) => {
        addNode(nodes, point.x, point.y, point.z, index === 3 ? 0.075 : 0.055, index === 3 ? 18 : 12);
    });

    addLine(lines, anchors[0], anchors[1]);
    addLine(lines, anchors[1], anchors[2]);
    addLine(lines, anchors[2], anchors[3]);
    addLine(lines, anchors[3], anchors[4]);
    addLine(lines, anchors[4], anchors[5]);
    addLine(lines, anchors[3], anchors[6]);
    addLine(lines, anchors[6], anchors[7]);
}

function addLeg(
    body: PointStore,
    details: PointStore,
    nodes: PointStore,
    lines: number[],
    side: -1 | 1,
    points: XY[]
) {
    const vectors = points.map(([x, y]) => new THREE.Vector3(x * side, y, 0.02));

    addCurve(body, vectors, 85, 5, false, 0.027, 0.065);
    addCurve(details, vectors, 70, 1, true, 0.011, 0.018);

    vectors.forEach((point, index) => {
        if (index === 0) return;

        addEllipse(body, point.x, point.y, index === vectors.length - 1 ? 0.045 : 0.07, index === vectors.length - 1 ? 0.04 : 0.06, 28, 0.05);
        addNode(nodes, point.x, point.y, 0.055, index === vectors.length - 1 ? 0.034 : 0.042, 7);
    });

    for (let i = 0; i < vectors.length - 1; i++) {
        addLine(lines, vectors[i], vectors[i + 1]);
    }
}

function addTail(
    body: PointStore,
    details: PointStore,
    nodes: PointStore,
    lines: number[]
) {
    // Segment centers follow the reference curve.
    const segments = [
        { x: 0, y: -1.0, rx: 0.28, ry: 0.21, r: 0.02 },
        { x: -0.06, y: -1.3, rx: 0.26, ry: 0.2, r: -0.06 },
        { x: -0.16, y: -1.62, rx: 0.25, ry: 0.19, r: -0.14 },
        { x: -0.3, y: -1.94, rx: 0.24, ry: 0.18, r: -0.24 },
        { x: -0.46, y: -2.23, rx: 0.23, ry: 0.17, r: -0.4 },
        { x: -0.54, y: -2.5, rx: 0.22, ry: 0.17, r: -0.68 },
        { x: -0.42, y: -2.74, rx: 0.21, ry: 0.16, r: -1.02 },
        { x: -0.14, y: -2.88, rx: 0.2, ry: 0.16, r: -1.28 },
        { x: 0.18, y: -2.9, rx: 0.19, ry: 0.15, r: 1.42 },
        { x: 0.48, y: -2.8, rx: 0.18, ry: 0.15, r: 1.16 },
        { x: 0.72, y: -2.6, rx: 0.17, ry: 0.14, r: 0.9 },
        { x: 0.88, y: -2.34, rx: 0.17, ry: 0.14, r: 0.62 },
    ];

    segments.forEach((segment, index) => {
        addRotatedEllipse(body, segment.x, segment.y, segment.rx, segment.ry, segment.r, index < 4 ? 130 : 100, 0.1);

        addNode(
            nodes,
            segment.x,
            segment.y,
            0.065,
            index % 3 === 0 ? 0.067 : 0.05,
            index % 3 === 0 ? 15 : 10
        );

        if (index < segments.length - 1) {
            addLine(
                lines,
                new THREE.Vector3(segment.x, segment.y, 0.065),
                new THREE.Vector3(segments[index + 1].x, segments[index + 1].y, 0.065)
            );
        }
    });

    // Join gaps between tail segments.
    const spine = segments.map((segment) => new THREE.Vector3(segment.x, segment.y, 0));

    addCurve(body, spine, 250, 7, false, 0.03, 0.07);
    addCurve(details, spine, 220, 2, true, 0.012, 0.02);

    // Terminal bulb.
    addRotatedEllipse(body, 0.98, -2.08, 0.28, 0.36, 0.42, 220, 0.12);
    addNode(nodes, 0.98, -2.08, 0.07, 0.07, 16);

    const stinger = [
        new THREE.Vector3(1.02, -1.94, 0),
        new THREE.Vector3(1.2, -1.76, 0.01),
        new THREE.Vector3(1.24, -1.52, 0.01),
        new THREE.Vector3(1.1, -1.36, 0),
        new THREE.Vector3(0.92, -1.38, 0),
    ];

    addCurve(body, stinger, 82, 6, false, 0.024, 0.05);
    addCurve(details, stinger, 70, 2, true, 0.01, 0.016);

    addNode(nodes, 1.2, -1.58, 0.06, 0.05, 10);
    addNode(nodes, 0.94, -1.38, 0.06, 0.042, 8);

    addLine(lines, new THREE.Vector3(0.88, -2.47, 0.065), new THREE.Vector3(1.02, -2.2, 0.07));
    addLine(lines, new THREE.Vector3(1.02, -2.2, 0.07), new THREE.Vector3(1.29, -1.65, 0.06));
    addLine(lines, new THREE.Vector3(1.29, -1.65, 0.06), new THREE.Vector3(1, -1.42, 0.06));
}

export function createScorpioGeometryPack(): ScorpioGeometryPack {
    const body: PointStore = { positions: [], colors: [] };
    const details: PointStore = { positions: [], colors: [] };
    const nodes: PointStore = { positions: [], colors: [] };
    const dust: PointStore = { positions: [], colors: [] };

    const lines: number[] = [];

    // Broad upper shield.
    const shield: XY[] = [
        [-0.48, 1.05],
        [-0.28, 1.24],
        [0, 1.32],
        [0.28, 1.24],
        [0.48, 1.05],
        [0.61, 0.68],
        [0.58, 0.3],
        [0.4, 0.08],
        [-0.4, 0.08],
        [-0.58, 0.3],
        [-0.61, 0.68],
    ];

    addPolygon(body, shield, 650, 0.14);
    addOutline(details, shield, 3);

    // Abdomen segments.
    addRotatedEllipse(body, 0, -0.15, 0.5, 0.32, 0, 300, 0.12);
    addRotatedEllipse(body, 0, -0.48, 0.46, 0.3, 0, 280, 0.12);
    addRotatedEllipse(body, 0, -0.76, 0.38, 0.25, 0, 220, 0.11);

    // Abdomen separators.
    [-0.02, -0.3, -0.58, -0.78].forEach((y, index) => {
        const width = [0.48, 0.45, 0.39, 0.3][index];

        addCurve(
            details,
            [
                new THREE.Vector3(-width, y, 0.05),
                new THREE.Vector3(0, y + 0.025, 0.06),
                new THREE.Vector3(width, y, 0.05),
            ],
            46,
            2,
            true,
            0.011,
            0.018
        );
    });

    // Claws.
    addClaw(body, details, nodes, lines, -1);
    addClaw(body, details, nodes, lines, 1);

    // Four articulated leg pairs.
    const legs: XY[][] = [
        [
            [0.48, 0.72],
            [0.8, 0.6],
            [1.02, 0.72],
            [1.2, 0.84],
        ],
        [
            [0.54, 0.42],
            [0.92, 0.3],
            [1.2, 0.36],
            [1.42, 0.44],
        ],
        [
            [0.52, 0.08],
            [0.9, -0.08],
            [1.2, -0.16],
            [1.42, -0.2],
        ],
        [
            [0.44, -0.28],
            [0.76, -0.48],
            [1.0, -0.68],
            [1.2, -0.84],
        ],
    ];

    legs.forEach((leg) => {
        addLeg(body, details, nodes, lines, -1, leg);
        addLeg(body, details, nodes, lines, 1, leg);
    });

    // Tail.
    addTail(body, details, nodes, lines);

    // Sparse body constellation.
    const bodyAnchors = [
        new THREE.Vector3(0, 1.17, 0.07),
        new THREE.Vector3(-0.34, 0.9, 0.07),
        new THREE.Vector3(0.34, 0.9, 0.07),
        new THREE.Vector3(-0.42, 0.5, 0.07),
        new THREE.Vector3(0, 0.62, 0.08),
        new THREE.Vector3(0.42, 0.5, 0.07),
        new THREE.Vector3(-0.38, 0.12, 0.06),
        new THREE.Vector3(0, 0.2, 0.07),
        new THREE.Vector3(0.38, 0.12, 0.06),
        new THREE.Vector3(-0.3, -0.25, 0.06),
        new THREE.Vector3(0, -0.2, 0.07),
        new THREE.Vector3(0.3, -0.25, 0.06),
        new THREE.Vector3(-0.24, -0.58, 0.05),
        new THREE.Vector3(0, -0.55, 0.06),
        new THREE.Vector3(0.24, -0.58, 0.05),
    ];

    bodyAnchors.forEach((point, index) => {
        addNode(nodes, point.x, point.y, point.z, index === 4 || index === 10 ? 0.07 : 0.048, index === 4 || index === 10 ? 16 : 10);
    });

    const bodyConnections: Array<[number, number]> = [
        [0, 1],
        [0, 2],
        [1, 4],
        [2, 4],
        [1, 3],
        [2, 5],
        [3, 4],
        [4, 5],
        [3, 6],
        [4, 7],
        [5, 8],
        [6, 7],
        [7, 8],
        [6, 9],
        [7, 10],
        [8, 11],
        [9, 10],
        [10, 11],
        [9, 12],
        [10, 13],
        [11, 14],
        [12, 13],
        [13, 14],
    ];

    bodyConnections.forEach(([a, b]) => {
        addLine(lines, bodyAnchors[a], bodyAnchors[b]);
    });

    // Keep dust close to the silhouette.
    for (let i = 0; i < 650; i++) {
        const area = Math.random();

        let x = 0;
        let y = 0;

        if (area < 0.52) {
            x = (Math.random() - 0.5) * 2.5;
            y = -0.7 + Math.random() * 2.5;
        } else if (area < 0.78) {
            const t = Math.random();

            x = -0.2 - 0.6 * t + (Math.random() - 0.5) * 0.65;
            y = -1 - 2 * t + (Math.random() - 0.5) * 0.5;
        } else {
            x = (Math.random() - 0.5) * 4.8;
            y = 1.6 + (Math.random() - 0.5) * 1.5;
        }

        const random = Math.random();

        const color = random > 0.95 ? BRONZE : random > 0.73 ? LIGHT_CYAN : BLUE;

        pushParticle(dust, x, y, (Math.random() - 0.5) * 0.9, color, 0.04, 0.12);
    }

    const lineGeometry = new THREE.BufferGeometry();

    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));

    return {
        body: createPointGeometry(body),
        details: createPointGeometry(details),
        nodes: createPointGeometry(nodes),
        lines: lineGeometry,
        dust: createPointGeometry(dust),
    };
}

// Keeps older code compatible.
export function createScorpioParticleGeometry() {
    return createScorpioGeometryPack().body;
}