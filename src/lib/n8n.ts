import { retryFetch } from "./retry-fetch";

export async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
  pdfBase64: string;
  pdfFilename: string;
  replyTo?: string;
}): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await retryFetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "FieldTicket <onboarding@resend.dev>",
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.replyTo,
        attachments: [
          {
            filename: payload.pdfFilename,
            content: payload.pdfBase64,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `Resend API error: ${response.status} ${err.message || JSON.stringify(err)}`
    );
  }

  const data = await response.json();
  return { id: data.id };
}
