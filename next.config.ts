import type { NextConfig } from "next";

// In locale il sito risponde direttamente su http://localhost:3000/
// Durante il deploy GitHub Actions usa il nome reale del repository, così il
// percorso resta corretto anche se il repository viene rinominato.
const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const basePath = process.env.BASE_PATH ?? (isGithubActions && repoName ? `/${repoName}` : "");

// Keep the development and production caches separate: mixing them makes the
// webpack runtime load chunk IDs from the other build and crash with
// "__webpack_modules__[moduleId] is not a function".
const distDir = process.env.NODE_ENV === "development" ? ".next-dev" : ".next";

const nextConfig: NextConfig = {
  distDir,
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
