import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep development startup from generating agent instruction files in the repo.
  agentRules: false,
  async headers() {
    return [{
      source: "/i/:path*",
      headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      ],
    }];
  },
};

export default nextConfig;
