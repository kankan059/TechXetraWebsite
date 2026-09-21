// rasterizeSvg.ts
import type { Point } from "../types";

type MaskPixel = Point & { alpha: number; edge: number; distance: number };

const MASK_SIZE = 256;

function seededRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function gaussian(seed: number): number {
  const first = Math.max(0.0001, seededRandom(seed));
  const second = seededRandom(seed + 1.37);
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(Math.PI * 2 * second);
}

function sampleMask(mask: MaskPixel[], seedOffset: number): MaskPixel {
  const position = (seedOffset * 0.61803398875) % 1;
  return mask[Math.floor(position * mask.length)];
}

function buildDistanceField(alpha: Uint8ClampedArray, width: number, height: number): Float32Array {
  const distances = new Float32Array(width * height);
  const diagonal = Math.SQRT2;
  distances.fill(Number.POSITIVE_INFINITY);

  for (let index = 0; index < distances.length; index += 1) {
    if (alpha[index] <= 24) distances[index] = 0;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (distances[index] === 0) continue;
      let distance = distances[index];
      if (x > 0) distance = Math.min(distance, distances[index - 1] + 1);
      if (y > 0) distance = Math.min(distance, distances[index - width] + 1);
      if (x > 0 && y > 0) distance = Math.min(distance, distances[index - width - 1] + diagonal);
      if (x < width - 1 && y > 0) distance = Math.min(distance, distances[index - width + 1] + diagonal);
      distances[index] = distance;
    }
  }

  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const index = y * width + x;
      if (distances[index] === 0) continue;
      let distance = distances[index];
      if (x < width - 1) distance = Math.min(distance, distances[index + 1] + 1);
      if (y < height - 1) distance = Math.min(distance, distances[index + width] + 1);
      if (x < width - 1 && y < height - 1) distance = Math.min(distance, distances[index + width + 1] + diagonal);
      if (x > 0 && y < height - 1) distance = Math.min(distance, distances[index + width - 1] + diagonal);
      distances[index] = distance;
    }
  }

  let maximum = 1;
  for (let index = 0; index < distances.length; index += 1) {
    if (Number.isFinite(distances[index])) maximum = Math.max(maximum, distances[index]);
  }

  for (let index = 0; index < distances.length; index += 1) {
    if (Number.isFinite(distances[index])) distances[index] /= maximum;
  }

  return distances;
}

async function loadSvgImage(source: string): Promise<HTMLImageElement> {
  const separator = source.includes("?") ? "&" : "?";
  const response = await fetch(`${source}${separator}v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load particle shape: ${response.status}`);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function rasterize(image: HTMLImageElement): MaskPixel[] {
  const canvas = document.createElement("canvas");
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, MASK_SIZE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Unable to create SVG mask canvas");

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const alpha = new Uint8ClampedArray(width * height);
  for (let index = 0; index < alpha.length; index += 1) alpha[index] = pixels[index * 4 + 3];
  const distances = buildDistanceField(alpha, width, height);
  const mask: MaskPixel[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelAlpha = alpha[y * width + x];
      if (pixelAlpha > 24) {
        let transparentNeighbors = 0;
        for (let neighborY = -1; neighborY <= 1; neighborY += 1) {
          for (let neighborX = -1; neighborX <= 1; neighborX += 1) {
            if (neighborX === 0 && neighborY === 0) continue;
            const sampleX = Math.min(width - 1, Math.max(0, x + neighborX));
            const sampleY = Math.min(height - 1, Math.max(0, y + neighborY));
            if (alpha[sampleY * width + sampleX] <= 24) transparentNeighbors += 1;
          }
        }

        mask.push({
          x: (x + 0.5) / width,
          y: (y + 0.5) / height,
          alpha: pixelAlpha / 255,
          edge: transparentNeighbors / 8,
          distance: distances[y * width + x],
        });
      }
    }
  }

  return mask;
}

export async function sampleSvgPoints(source: string, count: number): Promise<Point[]> {
  const mask = rasterize(await loadSvgImage(source));
  if (mask.length === 0) throw new Error("SVG shape has no visible geometry");

  const points: Point[] = [];
  const edgePixels = mask.filter((pixel) => pixel.edge > 0);
  const interiorPixels = mask.filter((pixel) => pixel.edge === 0);
  const edgeCount = Math.floor(count * 0.8);
  const interiorCount = count - edgeCount;

  for (let index = 0; index < edgeCount; index += 1) {
    const pixel = sampleMask(edgePixels.length ? edgePixels : mask, index + 11);
    const spread = 0.0008 + seededRandom(index + 17) * 0.004;
    points.push({
      x: pixel.x + gaussian(index + 23) * spread,
      y: pixel.y + gaussian(index + 31) * spread,
      edge: pixel.edge,
      distance: 0,
    });
  }

  for (let index = 0; index < interiorCount; index += 1) {
    const pixel = sampleMask(interiorPixels.length ? interiorPixels : mask, index + 211);
    const spread = 0.001 + seededRandom(index + 223) * 0.006;
    points.push({
      x: pixel.x + gaussian(index + 229) * spread,
      y: pixel.y + gaussian(index + 241) * spread,
      edge: pixel.edge,
      distance: pixel.distance,
    });
  }

  return points;
}
