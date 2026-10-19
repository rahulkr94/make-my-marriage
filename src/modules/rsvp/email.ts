import { Resend } from "resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function sendRsvpConfirmationEmail(input: {
  email: string;
  guestName: string;
  coupleName: string;
  eventName: string;
  response: "YES" | "NO";
  attendeeCount: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !input.email) return false;

  const safeGuest = escapeHtml(input.guestName);
  const safeCouple = escapeHtml(input.coupleName);
  const safeEvent = escapeHtml(input.eventName);
  const responseCopy = input.response === "YES"
    ? `Joyfully accepting for ${input.attendeeCount} ${input.attendeeCount === 1 ? "attendee" : "attendees"}`
    : "Unable to attend";
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: input.email,
    subject: `RSVP saved for ${input.eventName}`,
    html: `<div style="font-family:Arial,sans-serif;color:#1d1b18;line-height:1.7;max-width:620px;margin:auto"><p>Dear ${safeGuest},</p><p>Your response for <strong>${safeEvent}</strong> has been saved.</p><p style="padding:12px 16px;background:#fff8f3;border-radius:6px"><strong>${escapeHtml(responseCopy)}</strong></p><p>You can use your private invitation to update this response while RSVP remains open.</p><p>With warmth,<br>${safeCouple}</p></div>`,
  });
  if (result.error) console.error("RSVP confirmation email delivery failed", { name: result.error.name, message: result.error.message });
  return !result.error;
}
