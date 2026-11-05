import type { NextConfig } from "next";

// In locale il sito risponde direttamente su http://localhost:3000/
// Durante il deploy GitHub Actions imposta automaticamente il sottopercorso del repository
const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const basePath = process.env.BASE_PATH ?? (isGithubActions ? "/Dynamic_Flowers" : "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: "export",
  basePath,
  trailingSlash: true,
  allowedDevOrigins: ["localhost:3000", "127.0.0.1:3000"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
