import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: "export",
  basePath: "/Dynamic_Flowers",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
