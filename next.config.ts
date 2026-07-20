import type { NextConfig } from "next";

// Bundle analysis: this project builds with Turbopack (default for `next
// dev`/`next build`, no --webpack flag anywhere), so the webpack-only
// `@next/bundle-analyzer` plugin is a silent no-op here — it hooks into
// webpack's plugin system, which Turbopack doesn't use. Use the built-in
// Turbopack analyzer instead: `npx next experimental-analyze` (interactive)
// or `npx next experimental-analyze --output` (writes to
// .next/diagnostics/analyze). Available in Next 16.1+ (this project: 16.2.10).

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public bucket (menu photos, logos)
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    // Persist Turbopack's compiled module graph across dev restarts.
    turbopackFileSystemCacheForDev: true,
    // Trim the module graph Turbopack has to traverse for these
    // barrel-style/heavy packages on every cold compile.
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "date-fns",
      "radix-ui",
    ],
    webVitalsAttribution: ["CLS", "LCP", "INP"],
  },
  // Security headers. Deliberately not a nonce-based CSP (the App Router
  // guide's recommended approach): that requires forcing every page to
  // dynamic rendering via proxy.ts, which would break this app's static
  // routes and ISR. 'unsafe-inline' on style-src is needed for the two
  // legitimate dangerouslySetInnerHTML sites (chart.tsx's CSS vars,
  // [slug]/layout.tsx's per-restaurant theme CSS — both sanitized at the
  // source, see src/lib/theme.ts's safeHex()). connect-src/img-src allow
  // Supabase (API + Storage + Realtime websockets) and the Unsplash source
  // already in remotePatterns above.
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const csp = [
      "default-src 'self'",
      `script-src 'self'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
