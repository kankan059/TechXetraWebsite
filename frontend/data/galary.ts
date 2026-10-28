import galleryManifest from "./gallery-manifest.json";

export type ImageItem = {
  src: string;
  alt: string;
};

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

if (!CLOUD_NAME) {
  console.warn("⚠️ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set. Cloudinary URLs will be invalid.");
}

const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

// f_auto: automatic format (WebP/AVIF)
// q_auto: automatic quality optimization
// w_1200: limit max width to 1200px (adjust based on your dome gallery needs)
// c_limit: limit dimensions without cropping
const TRANSFORMATIONS = "f_auto,q_auto,w_1200,c_limit";

export async function getDomGalleryImages(): Promise<ImageItem[]> {
  // Fail gracefully if the environment variable is missing
  if (!CLOUD_NAME) {
    return [];
  }

  return galleryManifest
    // Sort by publicId to maintain a deterministic order (replaces the old fileName sort)
    .sort((a, b) => a.publicId.localeCompare(b.publicId))
    .map((item) => ({
      src: `${BASE_URL}/${TRANSFORMATIONS}/${item.publicId}`,
      alt: item.alt || "TechXetra Gallery Image",
    }));
}