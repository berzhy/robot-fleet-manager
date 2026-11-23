import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next runs one `next dev` per output folder. The e2e server sets
  // E2E_DIST_DIR so it can start while local dev holds `.next/dev/lock`.
  distDir: process.env.E2E_DIST_DIR ?? ".next",
  redirects() {
    return [{ source: "/", destination: "/robots", permanent: false }];
  },
  devIndicators: {
    position: "bottom-right",
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
