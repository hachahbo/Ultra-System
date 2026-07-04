import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public bucket (menu photos, logos)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
