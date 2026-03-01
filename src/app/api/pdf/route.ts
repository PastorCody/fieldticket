import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { StructuredTicket, Profile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

function generateTicketNumber(ticketId: string, createdAt: string): string {
  const date = new Date(createdAt);
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `FT-${dateStr}-${ticketId.slice(0, 4).toUpperCase()}`;
}

function buildPdfHtml(
  ticket: StructuredTicket,
  profile: Profile,
  ticketNumber: string
): string {
  const materialsRows = ticket.materials_used
    .map(
      (m) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${m.item}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${m.quantity}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${m.unit}</td>
    </tr>`
    )
    .join("");

  const equipmentList = ticket.equipment_used
    .map((e) => `<li style="margin-bottom:2px;">${e}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a1a2e; margin: 0; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #ff6b35; }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .header-left img { max-height: 50px; }
  .title { font-size: 22pt; font-weight: bold; color: #1a1a2e; }
  .ticket-num { font-size: 10pt; color: #666; }
  .section { margin-bottom: 16px; }
  .section-title { font-size: 11pt; font-weight: bold; color: #ff6b35; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .field-label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 0.3px; }
  .field-value { font-size: 10pt; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f4f6; padding: 6px 12px; text-align: left; font-size: 9pt; text-transform: uppercase; color: #666; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 2px solid #1a1a2e; display: flex; justify-content: space-between; }
  .footer-col { }
  .footer-label { font-size: 8pt; color: #888; text-transform: uppercase; }
  .footer-value { font-size: 10pt; font-weight: bold; margin-top: 2px; }
  .sig-line { margin-top: 24px; border-top: 1px solid #333; width: 200px; padding-top: 4px; font-size: 8pt; color: #888; }
</style></head>
<body>
  <div class="header">
    <div class="header-left">
      ${profile.logo_url ? `<img src="${profile.logo_url}" alt="Logo" />` : ""}
      <div>
        <div class="title">FIELD TICKET</div>
        <div style="font-size:10pt;color:#666;">${profile.company_name || ""}</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div class="ticket-num">${ticketNumber}</div>
      <div style="font-size:9pt;color:#888;">${ticket.job_date}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Job Information</div>
    <div class="grid">
      <div><div class="field-label">Job Type</div><div class="field-value">${ticket.job_type || "—"}</div></div>
      <div><div class="field-label">Well Name</div><div class="field-value">${ticket.well_name || "—"}</div></div>
      <div><div class="field-label">Lease Name</div><div class="field-value">${ticket.lease_name || "—"}</div></div>
      <div><div class="field-label">Operator</div><div class="field-value">${ticket.operator || "—"}</div></div>
      <div style="grid-column:span 2;"><div class="field-label">Location</div><div class="field-value">${ticket.location || "—"}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Time</div>
    <div class="grid">
      <div><div class="field-label">Start</div><div class="field-value">${ticket.start_time || "—"}</div></div>
      <div><div class="field-label">End</div><div class="field-value">${ticket.end_time || "—"}</div></div>
      <div><div class="field-label">Total Hours</div><div class="field-value" style="font-size:14pt;font-weight:bold;">${ticket.hours_worked || "—"}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Work Description</div>
    <p style="line-height:1.5;">${ticket.work_description || "—"}</p>
  </div>

  ${ticket.equipment_used.length > 0 ? `
  <div class="section">
    <div class="section-title">Equipment Used</div>
    <ul style="padding-left:20px;margin:0;">${equipmentList}</ul>
  </div>` : ""}

  ${ticket.materials_used.length > 0 ? `
  <div class="section">
    <div class="section-title">Materials Used</div>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:center;">Unit</th></tr></thead>
      <tbody>${materialsRows}</tbody>
    </table>
  </div>` : ""}

  ${ticket.safety_notes ? `
  <div class="section">
    <div class="section-title">Safety Notes</div>
    <p style="line-height:1.5;">${ticket.safety_notes}</p>
  </div>` : ""}

  ${ticket.additional_notes ? `
  <div class="section">
    <div class="section-title">Additional Notes</div>
    <p style="line-height:1.5;">${ticket.additional_notes}</p>
  </div>` : ""}

  <div class="footer">
    <div class="footer-col">
      <div class="footer-label">Worker</div>
      <div class="footer-value">${profile.full_name}</div>
      <div style="font-size:9pt;color:#666;">${profile.company_name || ""}</div>
      <div class="sig-line">Signature</div>
    </div>
    <div class="footer-col" style="text-align:right;">
      <div class="footer-label">Date</div>
      <div class="footer-value">${ticket.job_date}</div>
    </div>
  </div>

  <div style="margin-top:24px;text-align:center;font-size:8pt;color:#bbb;">
    Generated by FieldTicket
  </div>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const { ticketId } = await request.json();
    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Load ticket
    const { data: ticket } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", ticket.user_id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const ticketNumber = generateTicketNumber(ticketId, ticket.created_at);
    const html = buildPdfHtml(
      ticket.structured_data as StructuredTicket,
      profile as Profile,
      ticketNumber
    );

    // Return HTML that client can use to generate PDF, or store as-is
    // For now, return the HTML and ticket number — PDF generation via browser print or server-side tool
    return NextResponse.json({
      html,
      ticketNumber,
      ticketId,
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "PDF generation failed",
      },
      { status: 500 }
    );
  }
}
