import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // /dokumenti reads the extracted official texts at request time
  // SNAPSHOT_SOURCE=file (set by scripts/vercel-build.sh when the database is unreachable) is inlined at
  // build time so that runtime renders (ISR, dynamic routes) also read the committed snapshot
  env: { SNAPSHOT_SOURCE: process.env.SNAPSHOT_SOURCE ?? "" },
  outputFileTracingIncludes: {
    "/**": ["./data/snapshots/published.json", "./data/events/legislative.json"],
    "/dokumenti": ["./data/extracted/*.json", "./data/extracted/*.txt"],
    "/prognozi": ["./data/extracted/*.tables.json"],
    // Open Graph images read their fonts from disk
    "/**/opengraph-image*": ["./assets/fonts/*.ttf"],
    "/opengraph-image*": ["./assets/fonts/*.ttf"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
