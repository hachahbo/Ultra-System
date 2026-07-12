import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public bucket (menu photos, logos)
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
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
  },
};

export default nextConfig;
