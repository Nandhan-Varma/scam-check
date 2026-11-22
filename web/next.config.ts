import type { NextConfig } from "next";

// FastAPI backend that holds the Gemini API key. The browser only talks to
// this app; /api/* is proxied server-side so the key never reaches the client.
const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const securityHeaders = [
  // No framing (clickjacking), no plugins, forms and <base> stay on this site.
  // Script sources aren't restricted: Next's inline bootstrap scripts would need nonces.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Rewrites buffer the request body. Room for the largest upload
    // (NEXT_PUBLIC_MAX_UPLOAD_MB, default 4) + text field + multipart overhead.
    proxyClientMaxBodySize: `${(Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 4) + 1}mb`,
    // The proxy gives up after 30 s by default; a few minutes of call recording or
    // video takes Gemini longer than that (a 4-minute MP3 took ~50 s).
    proxyTimeout: 180_000,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
