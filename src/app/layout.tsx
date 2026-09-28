import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "@/app/globals.css";
const playfair = localFont({ src: "../../public/fonts/playfair-400.ttf", variable: "--font-playfair", display: "swap", weight: "400" });
const jakarta = localFont({ src: [{ path: "../../public/fonts/jakarta-400.ttf", weight: "400" }, { path: "../../public/fonts/jakarta-600.ttf", weight: "600" }], variable: "--font-jakarta", display: "swap" });
export const metadata: Metadata = {
    title: "Make My Marriage | Every celebration, beautifully organized.",
    description: "A calmer way to plan your Indian wedding. Explore one workspace for events, guests, invitations, tasks, expenses, and memories.",
};
export default function RootLayout({ children }: {
    children: ReactNode;
}) {
    return (<html lang="en" className={`${playfair.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>);
}
