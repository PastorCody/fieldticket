import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { FieldTicketPDF } from "@/lib/pdf-template";
import { sendEmail } from "@/lib/n8n";
import React from "react";
import type { StructuredTicket, Profile, Contact, PricingData } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

function buildPricingHtml(pricing: PricingData | null): string {
  if (!pricing || (pricing.rate_type === "none" && (!pricing.line_items || pricing.line_items.length === 0))) {
    return "";
  }
  let html = `<tr><td colspan="2" style="padding:8px 0 4px 0;"><strong style="color:#ff6b35;">Pricing</strong></td></tr>`;
  if (pricing.rate_type !== "none") {
    const rateLabel = pricing.rate_type === "day" ? "Day Rate" : pricing.rate_type === "hourly" ? "Hourly Rate" : "Flat Rate";
    const rateVal = pricing.day_rate || pricing.hourly_rate || pricing.flat_rate || 0;
    html += `<tr><td style="padding:4px 0;color:#666;">${rateLabel}:</td><td style="padding:4px 0;font-weight:bold;">$${rateVal.toFixed(2)}</td></tr>`;
    if (pricing.subtotal) {
      html += `<tr><td style="padding:4px 0;color:#666;">Subtotal:</td><td style="padding:4px 0;font-weight:bold;">$${pricing.subtotal.toFixed(2)}</td></tr>`;
    }
  }
  if (pricing.total != null && pricing.total > 0) {
    html += `<tr><td style="padding:4px 0;color:#666;">Total:</td><td style="padding:4px 0;font-weight:bold;color:#ff6b35;font-size:16px;">$${pricing.total.toFixed(2)}</td></tr>`;
  }
  if (pricing.notes) {
    html += `<tr><td style="padding:4px 0;color:#666;">Reference:</td><td style="padding:4px 0;">${pricing.notes}</td></tr>`;
  }
  return html;
}

function buildRecipientEmailHtml(
  ticket: StructuredTicket,
  profile: Profile,
  ticketNumber: string,
  pricing?: PricingData | null
): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#1a1a2e;padding:20px;border-radius:8px 8px 0 0;">
    <h2 style="color:#ff6b35;margin:0;">Field Ticket</h2>
    <p style="color:#ccc;margin:4px 0 0;">${ticketNumber}</p>
  </div>
  <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p>Please find the attached field ticket for the following job:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:4px 0;color:#666;width:120px;">Job Type:</td><td style="padding:4px 0;font-weight:bold;">${ticket.job_type}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">Well:</td><td style="padding:4px 0;font-weight:bold;">${ticket.well_name}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">Date:</td><td style="padding:4px 0;font-weight:bold;">${ticket.job_date}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">Hours:</td><td style="padding:4px 0;font-weight:bold;">${ticket.hours_worked}</td></tr>
      ${(ticket.custom_fields ?? []).filter(cf => cf.label && cf.value).map(cf => `<tr><td style="padding:4px 0;color:#666;">${cf.label}:</td><td style="padding:4px 0;font-weight:bold;">${cf.value}</td></tr>`).join("")}
      ${buildPricingHtml(pricing || null)}
    </table>
    <p style="color:#666;">${ticket.work_description?.slice(0, 300) || ""}${(ticket.work_description?.length || 0) > 300 ? "..." : ""}</p>
    <p style="margin-top:16px;color:#888;font-size:12px;">The complete field ticket is attached as a PDF.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
    <p style="margin:0;font-weight:bold;">${profile.full_name}</p>
    <p style="margin:2px 0;color:#666;">${profile.company_name || ""}</p>
    ${profile.phone ? `<p style="margin:2px 0;color:#666;">${profile.phone}</p>` : ""}
    <p style="margin:12px 0 0;font-size:11px;color:#bbb;">Sent via FieldTicket</p>
  </div>
</div>`;
}

function buildSenderCopyHtml(
  ticket: StructuredTicket,
  profile: Profile,
  contact: Contact,
  ticketNumber: string,
  pricing?: PricingData | null
): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#1a1a2e;padding:20px;border-radius:8px 8px 0 0;">
    <h2 style="color:#ff6b35;margin:0;">Your Field Ticket Copy</h2>
    <p style="color:#ccc;margin:4px 0 0;">${ticketNumber}</p>
  </div>
  <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p style="color:#333;font-weight:bold;">This field ticket was sent to ${contact.name} (${contact.email})${contact.company ? ` at ${contact.company}` : ""}.</p>
    <p style="color:#666;">Below is a summary of what was sent. The full PDF is attached.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:4px 0;color:#666;width:120px;">Job Type:</td><td style="padding:4px 0;font-weight:bold;">${ticket.job_type}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">Well:</td><td style="padding:4px 0;font-weight:bold;">${ticket.well_name}</td></tr>
      ${ticket.lease_name ? `<tr><td style="padding:4px 0;color:#666;">Lease:</td><td style="padding:4px 0;font-weight:bold;">${ticket.lease_name}</td></tr>` : ""}
      ${ticket.operator ? `<tr><td style="padding:4px 0;color:#666;">Operator:</td><td style="padding:4px 0;font-weight:bold;">${ticket.operator}</td></tr>` : ""}
      <tr><td style="padding:4px 0;color:#666;">Date:</td><td style="padding:4px 0;font-weight:bold;">${ticket.job_date}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">Hours:</td><td style="padding:4px 0;font-weight:bold;">${ticket.hours_worked}</td></tr>
      ${(ticket.custom_fields ?? []).filter(cf => cf.label && cf.value).map(cf => `<tr><td style="padding:4px 0;color:#666;">${cf.label}:</td><td style="padding:4px 0;font-weight:bold;">${cf.value}</td></tr>`).join("")}
      ${buildPricingHtml(pricing || null)}
    </table>
    <p style="color:#666;">${ticket.work_description?.slice(0, 500) || ""}${(ticket.work_description?.length || 0) > 500 ? "..." : ""}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
    <p style="margin:0;color:#888;font-size:12px;">This is your copy for your records. The same field ticket and PDF was delivered to ${contact.name}.</p>
    <p style="margin:8px 0 0;font-size:11px;color:#bbb;">Sent via FieldTicket</p>
  </div>
</div>`;
}

export async function POST(request: Request) {
  try {
    // Auth check
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticketId, recipientId } = await request.json();
    if (!ticketId || !recipientId) {
      return NextResponse.json(
        { error: "ticketId and recipientId are required" },
        { status: 400 }
      );
    }

    const uuidPrefix = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
    if (!uuidPrefix.test(ticketId) || !uuidPrefix.test(recipientId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Load ticket, profile, contact
    const [ticketRes, contactRes] = await Promise.all([
      supabase.from("tickets").select("*").eq("id", ticketId).single(),
      supabase.from("contacts").select("*").eq("id", recipientId).single(),
    ]);

    if (!ticketRes.data)
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // Ownership check
    if (ticketRes.data.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!contactRes.data)
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );

    const ticket = ticketRes.data;
    const contact = contactRes.data as Contact;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", ticket.user_id)
      .single();

    if (!profile)
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );

    const structured = ticket.structured_data as StructuredTicket;
    const prof = profile as Profile;
    const pricingData = ticket.pricing_data as PricingData | null;

    // Generate ticket number (8 chars to avoid collision)
    const date = new Date(ticket.created_at);
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const ticketNumber = `FT-${dateStr}-${ticketId.slice(0, 8).toUpperCase()}`;

    // Generate actual PDF binary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(FieldTicketPDF, {
      ticket: structured,
      profile: prof,
      ticketNumber,
      pricing: pricingData,
    }) as any;
    const pdfBuffer = await renderToBuffer(element);
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    // ── 1. Send to RECIPIENT (employer) ──
    const recipientSubject = `Field Ticket - ${structured.well_name || "Job"} - ${structured.job_date}`;
    const recipientHtml = buildRecipientEmailHtml(structured, prof, ticketNumber, pricingData);

    const result = await sendEmail({
      to: contact.email,
      subject: recipientSubject,
      html: recipientHtml,
      pdfBase64,
      pdfFilename: `${ticketNumber}.pdf`,
      replyTo: prof.email,
    });

    // ── 2. Send COPY to SENDER (the worker) ──
    const senderSubject = `Your Copy: Field Ticket - ${structured.well_name || "Job"} - ${structured.job_date}`;
    const senderHtml = buildSenderCopyHtml(structured, prof, contact, ticketNumber, pricingData);

    try {
      await sendEmail({
        to: prof.email,
        subject: senderSubject,
        html: senderHtml,
        pdfBase64,
        pdfFilename: `${ticketNumber}.pdf`,
      });
    } catch (senderCopyError) {
      // Don't fail the whole request if the sender copy fails — the main email went through
      console.error("Sender copy email failed (recipient email was sent):", senderCopyError);
    }

    // Email sent successfully — update status immediately
    const now = new Date().toISOString();
    await supabase
      .from("tickets")
      .update({
        status: "sent",
        recipient_id: recipientId,
        sent_at: now,
        updated_at: now,
      })
      .eq("id", ticketId);

    // Log email (recipient)
    await supabase.from("email_log").insert({
      ticket_id: ticketId,
      recipient_email: contact.email,
      resend_id: result.id || null,
      status: "sent",
      sent_at: now,
    });

    // Upload PDF to Supabase Storage (non-blocking)
    const pdfPath = `${ticket.user_id}/${ticketNumber}.pdf`;
    try {
      await supabase.storage.from("pdfs").upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });
      await supabase
        .from("tickets")
        .update({ pdf_url: pdfPath })
        .eq("id", ticketId);
    } catch (storageError) {
      console.error("PDF storage upload failed (email was sent):", storageError);
    }

    return NextResponse.json({ success: true, ticketNumber });
  } catch (error) {
    console.error("Send error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send ticket",
      },
      { status: 500 }
    );
  }
}
