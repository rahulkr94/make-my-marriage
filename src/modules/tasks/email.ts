import { Resend } from "resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>'\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '\"': "&quot;" })[character] ?? character);
}

export async function sendTaskAssignmentEmail(input: {
  email: string;
  assigneeName: string;
  assignerName: string;
  weddingName: string;
  taskTitle: string;
  dueLabel: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.APP_URL;
  if (!apiKey || !from || !appUrl) return false;

  const taskUrl = new URL("/tasks", appUrl).toString();
  const dueCopy = input.dueLabel ? `<p><strong>Due:</strong> ${escapeHtml(input.dueLabel)}</p>` : "";
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: input.email,
    subject: `Wedding task assigned: ${input.taskTitle}`,
    html: `<div style="font-family:Arial,sans-serif;color:#1d1b18;line-height:1.7;max-width:620px;margin:auto"><p>Hello ${escapeHtml(input.assigneeName)},</p><p>${escapeHtml(input.assignerName)} assigned you a task for <strong>${escapeHtml(input.weddingName)}</strong>.</p><div style="padding:14px 18px;background:#fff8f3;border-radius:6px"><strong>${escapeHtml(input.taskTitle)}</strong>${dueCopy}</div><p><a href="${escapeHtml(taskUrl)}">Open wedding tasks</a></p></div>`,
  });
  if (result.error) console.error("Task assignment email delivery failed", { name: result.error.name, message: result.error.message });
  return !result.error;
}
