import type { NextConfig } from "next";

// Static export: the app is plain files that talk to Supabase from the browser,
// so it can be hosted on Vercel (or any static host) with no server.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
