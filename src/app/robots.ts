import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/events",
        "/expenses",
        "/forgot-password",
        "/gallery",
        "/guests",
        "/login",
        "/members",
        "/notifications",
        "/rsvps",
        "/settings",
        "/setup",
        "/signup",
        "/tasks",
        "/vendors",
        "/welcome",
        "/i/",
        "/g/",
        "/join/",
        "/reset-password",
      ],
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
