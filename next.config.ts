import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep development startup from generating agent instruction files in the repo.
  agentRules: false,
};

export default nextConfig;
