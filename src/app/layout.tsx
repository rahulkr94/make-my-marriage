import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "@/app/globals.css";
const playfair = localFont({ src: "../../public/fonts/playfair-400.ttf", variable: "--font-playfair", display: "swap", weight: "400" });
const jakarta = localFont({ src: [{ path: "../../public/fonts/jakarta-400.ttf", weight: "400" }, { path: "../../public/fonts/jakarta-600.ttf", weight: "600" }], variable: "--font-jakarta", display: "swap" });
const metadataBase = (() => { try { return new URL(process.env.APP_URL || "http://localhost:3000"); } catch { return new URL("http://localhost:3000"); } })();
export const metadata: Metadata = {
    metadataBase,
    applicationName: "Make My Marriage",
    title: "Make My Marriage | Every celebration, beautifully organized.",
    description: "A calmer way to plan your Indian wedding. Explore one workspace for events, guests, invitations, tasks, expenses, and memories.",
    openGraph: { type: "website", url: "/", siteName: "Make My Marriage", title: "Make My Marriage | Every celebration, beautifully organized.", description: "A calmer way to plan your Indian wedding—from ceremonies and guests to tasks, expenses, and memories." },
    twitter: { card: "summary", title: "Make My Marriage", description: "A calmer way to plan your Indian wedding." },
};
export default function RootLayout({ children }: {
    children: ReactNode;
}) {
    return (<html lang="en" data-scroll-behavior="smooth" className={`${playfair.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>);
}
