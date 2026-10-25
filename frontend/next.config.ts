import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techxetra-backend.onrender.com";

function getBackendDestination(): string {
  let base = BACKEND_URL.trim().replace(/\/+$/, "");
  base = base.replace(/\/api\/v1$/, "").replace(/\/api$/, "");
  return `${base}/api/v1/:path*`;
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: getBackendDestination(),
      },
    ];
  },
};

export default nextConfig;
