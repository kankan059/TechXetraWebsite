
import { readdir } from "node:fs/promises";
import path from "node:path";

export type ImageItem = {
  src: string;
  alt: string;
};

const supportedImageExtensions = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);

export async function getDomGalleryImages(): Promise<ImageItem[]> {
  const imagesDirectory = path.join(process.cwd(), "public", "images");
  const files = await readdir(imagesDirectory, { withFileTypes: true });

  return files
    .filter(
      (file) =>
        file.isFile() &&
        supportedImageExtensions.has(path.extname(file.name).toLowerCase()),
    )
    .map((file) => ({
      src: `/images/${encodeURIComponent(file.name)}`,
      alt: path.parse(file.name).name.replace(/[-_]+/g, " "),
      fileName: file.name,
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName))
    .map(({ fileName: _fileName, ...image }) => image);
}
