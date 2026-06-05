import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: {
    // effect library (replicate SDK dep) ships .ts source files with strict errors
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    proxyClientMaxBodySize: "50mb",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/npm/cryptocurrency-icons@**",
      },
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
        pathname: "/coins/images/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/casperstack/thai-banks-logo/**",
      },
      {
        protocol: "https",
        hostname: "scdn.line-apps.com",
        pathname: "/n/**",
      },
    ],
  },
};

export default nextConfig;
