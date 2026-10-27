import { Resend } from "resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
export function createGuestInvitationUrl(token: string, requestOrigin?: string) {
  const base = process.env.APP_URL || requestOrigin;
  if (!base) return null;
  return new URL(`/i/${encodeURIComponent(token)}`, base).toString();
}

export async function sendGuestInvitationEmail(input: {
  email: string;
  guestName: string;
  coupleName: string;
  invitationUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return false;

  const safeGuestName = escapeHtml(input.guestName);
  const safeCoupleName = escapeHtml(input.coupleName);
  const safeUrl = escapeHtml(input.invitationUrl);
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: input.email,
    subject: `You’re invited to ${input.coupleName}’s wedding`,
    html: `<div style="font-family:Arial,sans-serif;color:#1d1b18;line-height:1.7;max-width:620px;margin:auto"><p>Dear ${safeGuestName},</p><p><strong>${safeCoupleName}</strong> would be delighted to celebrate their wedding with you.</p><p><a href="${safeUrl}" style="display:inline-block;background:#964400;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px">Open your private invitation</a></p><p>This private link contains the ceremonies selected for you. Please keep it safe and avoid posting it publicly.</p><p>With warmth,<br>${safeCoupleName}</p></div>`,
  });
  if (result.error) {
    console.error("Guest invitation email delivery failed", { name: result.error.name, message: result.error.message });
  }
  return !result.error;
}
