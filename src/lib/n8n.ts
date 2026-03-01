export async function sendViaN8n(payload: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  senderEmail: string;
  companyName: string;
  subject: string;
  htmlBody: string;
  pdfBase64: string;
  pdfFilename: string;
}): Promise<{ success: boolean; id?: string }> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("N8N_WEBHOOK_URL is not configured");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`n8n webhook failed: ${response.status} ${text}`);
  }

  const data = await response.json().catch(() => ({}));
  return { success: true, id: data.id || data.messageId };
}
