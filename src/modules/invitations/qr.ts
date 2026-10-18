import QRCode from "qrcode";

export async function createInvitationQrDataUrl(invitationUrl: string) {
  return QRCode.toDataURL(invitationUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 720,
    color: { dark: "#644b32", light: "#fff8f3" },
  });
}
