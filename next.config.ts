import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // GitHub Pages 部署在子路径 /ai-relay-dashboard/
  basePath: '/ai-relay-dashboard',
  assetPrefix: '/ai-relay-dashboard/',
};

export default nextConfig;
