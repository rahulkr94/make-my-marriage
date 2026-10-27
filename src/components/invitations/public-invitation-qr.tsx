"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function PublicInvitationQr({ guestName }: { guestName: string }) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(window.location.href, { errorCorrectionLevel: "M", margin: 2, width: 640, color: { dark: "#964400", light: "#fff8f3" } }).then(setQr).catch(() => setQr(""));
  }, []);
  if (!qr) return null;
  return <section className="mx-auto mt-10 max-w-xl rounded-xl bg-surface-container p-6 text-center sm:p-8"><p className="text-label-sm font-semibold uppercase tracking-[0.16em] text-primary">Your private invitation</p><h2 className="mt-2 font-serif text-headline-sm">Keep this invitation close</h2><p className="mx-auto mt-2 max-w-md text-body-sm leading-6 text-on-surface-variant">This QR code opens the same private invitation. Keep it personal and avoid sharing it publicly.</p><details className="mt-5"><summary className="mx-auto w-fit cursor-pointer rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary">Show invitation QR</summary><div className="mt-5"><Image unoptimized src={qr} width={240} height={240} alt={`${guestName}’s private wedding invitation QR code`} className="mx-auto h-56 w-56 rounded-lg" /><a href={qr} download={`${guestName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest"}-wedding-invitation.png`} className="mt-4 inline-flex rounded-lg border border-primary/25 bg-surface px-5 py-2.5 text-body-sm font-semibold text-primary">Download QR code</a></div></details></section>;
}
