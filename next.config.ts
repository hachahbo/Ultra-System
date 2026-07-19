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
};

export default nextConfig;
