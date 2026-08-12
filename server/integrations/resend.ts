import { ENV } from "../_core/env";

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  if (!ENV.resendApiKey || !ENV.resendFromEmail) throw new Error("Resend is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "BuduTech-Academy/1.0",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({ from: ENV.resendFromEmail, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
  });
  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok || !payload?.id) throw new Error(payload?.message ?? "Resend request failed.");
  return payload.id;
}
