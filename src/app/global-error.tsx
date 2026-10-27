"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Application shell failed", { digest: error.digest }); }, [error]);
  return <html lang="en"><body style={{ margin: 0, background: "#fff8f3", color: "#1d1b18", fontFamily: "Arial, sans-serif" }}><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", boxSizing: "border-box" }}><section style={{ width: "100%", maxWidth: 620, background: "#fff", border: "1px solid #ddc1b3", borderRadius: 12, padding: "48px 32px", boxSizing: "border-box", textAlign: "center", boxShadow: "0 24px 48px -12px rgba(28,26,23,0.10)" }}><p style={{ color: "#964400", fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>Make My Marriage</p><h1 style={{ margin: "18px 0 0", fontFamily: "Georgia, serif", fontSize: 38, fontWeight: 400 }}>We need a moment</h1><p style={{ margin: "16px auto 0", maxWidth: 480, color: "#564338", lineHeight: 1.7 }}>The application could not finish loading. Please try again; your saved information has not been changed.</p>{error.digest && <p style={{ marginTop: 12, color: "#564338", fontSize: 12 }}>Reference: {error.digest}</p>}<button type="button" onClick={reset} style={{ marginTop: 28, border: 0, borderRadius: 4, background: "#964400", color: "#fff", padding: "13px 22px", fontWeight: 700, cursor: "pointer" }}>Try again</button></section></main></body></html>;
}
