import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  distDir: process.env.VERCEL ? ".next" : ".next-local.nosync",
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

export default nextConfig;
