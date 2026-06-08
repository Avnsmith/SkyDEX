import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // some next versions put it under experimental, some top level
  },
  serverExternalPackages: [],
  // @ts-ignore
  turbopack: {
    root: "../../",
  },
};

export default nextConfig;
