import { Resend } from "resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function createMemberInvitationUrl(token: string) {
  const appUrl = process.env.APP_URL;
  if (!appUrl) return null;
  return new URL(`/join/${encodeURIComponent(token)}`, appUrl).toString();
}

export async function sendMemberInvitationEmail(input: {
  email: string;
  token: string;
  weddingName: string;
  inviterName: string;
  role: "MANAGER" | "MEMBER";
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const invitationUrl = createMemberInvitationUrl(input.token);
  if (!apiKey || !from || !invitationUrl) return false;

  const safeWeddingName = escapeHtml(input.weddingName);
  const safeInviterName = escapeHtml(input.inviterName);
  const safeUrl = escapeHtml(invitationUrl);
  const role = input.role === "MANAGER" ? "Manager" : "Member";
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: input.email,
    subject: `Join ${input.weddingName} on Make My Marriage`,
    html: `<div style="font-family:Arial,sans-serif;color:#1d1b18;line-height:1.6"><p>Hello,</p><p>${safeInviterName} invited you to join <strong>${safeWeddingName}</strong> as a ${role}.</p><p><a href="${safeUrl}">Accept your invitation</a></p><p>This private link expires in seven days and can be used once. If you were not expecting it, you can ignore this email.</p></div>`,
  });
  if (result.error) {
    console.error("Member invitation email delivery failed", {
      name: result.error.name,
      message: result.error.message,
    });
  }
  return !result.error;
}
