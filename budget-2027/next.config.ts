import type { NextConfig } from "next";

// Content Security Policy: everything is served from the site itself. Inline scripts are needed by Next.js
// (static pages cannot carry nonces) and by the theme script; eval only in development (React refresh).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
  // /sektori was merged into /razhodi (same functions breakdown); keep old links working
  async redirects() {
    return [{ source: "/sektori", destination: "/razhodi#funktsii", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
