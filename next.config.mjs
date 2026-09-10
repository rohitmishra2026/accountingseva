// Next's dev server compiles and evaluates modules with eval() for hot reload,
// so `script-src` must permit 'unsafe-eval' locally or React never hydrates and
// every page renders blank.
//
// This did not surface while the CSP lived in vercel.json, because Next never
// reads that file - those headers only ever applied to deployed Vercel builds,
// never to `next dev`. Moving the CSP into this file made it apply locally too,
// which is the point of moving it, but it means dev now needs the exemption
// that production must not have.
//
// PRODUCTION IS UNCHANGED: the built bundle contains no eval, so 'unsafe-eval'
// is added only when NODE_ENV is development.
const isDev = process.env.NODE_ENV === "development";

const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Drop the `X-Powered-By: Next.js` response header. It tells an attacker the
  // framework and narrows their search for applicable CVEs, and it buys nothing
  // in return. Purely a response header: affects no rendering, no routing and
  // no client behaviour.
  poweredByHeader: false,
  // NOTE: intentionally NOT using `output: 'export'`.
  // The client portal relies on server components, route handlers and
  // middleware, none of which are compatible with a static export.
  images: {
    // Marketing placeholder images live in /public and are served as-is.
    // Add remote patterns here only if you later serve images off a CDN.
    remotePatterns: [],
  },
  // The PDF report route reads the Inter fonts and the logo from disk at
  // runtime. Next's tracer cannot see fs.readFileSync paths, so include them
  // in the serverless bundle explicitly, or the download 500s in production.
  // (Top-level in Next 15; nested under experimental in 14.x.)
  experimental: {
    outputFileTracingIncludes: {
      "/api/report": [
        "./src/lib/pdf-assets/*.ttf",
        "./public/images/logo-card.png",
      ],
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://*.supabase.co https://maps.googleapis.com https://maps.gstatic.com https://*.google.com",
              "font-src 'self' data:",
              // Dev also needs the HMR websocket back to the dev server.
              `connect-src 'self' https://*.supabase.co${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
              "frame-src https://www.google.com https://maps.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
