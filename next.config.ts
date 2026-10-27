import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep development startup from generating agent instruction files in the repo.
  agentRules: false,
  poweredByHeader: false,
  async headers() {
    const privateHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
    ];
    const privatePagePaths = [
      "/dashboard",
      "/events/:path*",
      "/expenses/:path*",
      "/forgot-password",
      "/gallery/:path*",
      "/guests/:path*",
      "/login",
      "/members/:path*",
      "/notifications/:path*",
      "/rsvps/:path*",
      "/settings/:path*",
      "/setup/:path*",
      "/signup",
      "/tasks/:path*",
      "/vendors/:path*",
      "/welcome",
    ];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
      { source: "/i/:path*", headers: privateHeaders },
      { source: "/g/:path*", headers: privateHeaders },
      { source: "/join/:path*", headers: privateHeaders },
      { source: "/reset-password", headers: privateHeaders },
      ...privatePagePaths.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] })),
    ];
  },
};

export default nextConfig;
