import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { FieldTicketPDF } from "@/lib/pdf-template";
import { sendViaN8n } from "@/lib/n8n";
import React from "react";
import type { StructuredTicket, Profile, Contact } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

function buildEmailHtml(
  ticket: StructuredTicket,
  profile: Profile,
  ticketNumber: string
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

export async function POST(request: Request) {
  try {
    const { ticketId, recipientId } = await request.json();
    if (!ticketId || !recipientId) {
      return NextResponse.json(
        { error: "ticketId and recipientId are required" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Load ticket, profile, contact
    const [ticketRes, contactRes] = await Promise.all([
      supabase.from("tickets").select("*").eq("id", ticketId).single(),
      supabase.from("contacts").select("*").eq("id", recipientId).single(),
    ]);

    if (!ticketRes.data)
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
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

    // Generate ticket number
    const date = new Date(ticket.created_at);
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const ticketNumber = `FT-${dateStr}-${ticketId.slice(0, 4).toUpperCase()}`;

    // Generate actual PDF binary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(FieldTicketPDF, {
      ticket: structured,
      profile: prof,
      ticketNumber,
    }) as any;
    const pdfBuffer = await renderToBuffer(element);
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    // Build email
    const subject = `Field Ticket - ${structured.well_name || "Job"} - ${structured.job_date}`;
    const htmlBody = buildEmailHtml(structured, prof, ticketNumber);

    // Send via n8n webhook (n8n attaches the PDF and sends via Gmail)
    const result = await sendViaN8n({
      recipientEmail: contact.email,
      recipientName: contact.name,
      senderName: prof.full_name,
      senderEmail: prof.email,
      companyName: prof.company_name || "",
      subject,
      htmlBody,
      pdfBase64,
      pdfFilename: `${ticketNumber}.pdf`,
    });

    // Upload PDF to Supabase Storage
    const pdfPath = `${ticket.user_id}/${ticketNumber}.pdf`;
    await supabase.storage.from("pdfs").upload(pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

    // Update ticket status
    await supabase
      .from("tickets")
      .update({
        status: "sent",
        recipient_id: recipientId,
        sent_at: new Date().toISOString(),
        pdf_url: pdfPath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    // Log email
    await supabase.from("email_log").insert({
      ticket_id: ticketId,
      recipient_email: contact.email,
      resend_id: result.id || null,
      status: "sent",
    });

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
