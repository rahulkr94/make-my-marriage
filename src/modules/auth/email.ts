import { Resend } from "resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function sendPasswordResetEmail(input: { name: string; email: string; token: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.APP_URL;
  if (!apiKey || !from || !appUrl) return false;

  const resetUrl = new URL("/reset-password", appUrl);
  resetUrl.searchParams.set("token", input.token);
  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(resetUrl.toString());
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: input.email,
    subject: "Reset your Make My Marriage password",
    html: `<div style="font-family:Arial,sans-serif;color:#1d1b18;line-height:1.6"><p>Hello ${safeName},</p><p>Use the link below to choose a new password. It expires in one hour and can be used once.</p><p><a href="${safeUrl}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
  });
  return !result.error;
}
