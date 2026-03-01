import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { FieldTicketPDF } from "@/lib/pdf-template";
import React from "react";
import type { StructuredTicket, Profile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

function generateTicketNumber(ticketId: string, createdAt: string): string {
  const date = new Date(createdAt);
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `FT-${dateStr}-${ticketId.slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    // Auth check
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticketId, format } = await request.json();
    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(ticketId)) {
      return NextResponse.json({ error: "Invalid ticketId" }, { status: 400 });
    }

    const supabase = await createServiceClient();

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

    // Ownership check
    if (ticket.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const structured = ticket.structured_data as StructuredTicket;
    const prof = profile as Profile;

    // Generate actual PDF buffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(FieldTicketPDF, {
      ticket: structured,
      profile: prof,
      ticketNumber,
    }) as any;
    const pdfBuffer = await renderToBuffer(element);

    // Return base64 for API consumers, or raw PDF for download
    if (format === "base64") {
      return NextResponse.json({
        pdf: Buffer.from(pdfBuffer).toString("base64"),
        ticketNumber,
        ticketId,
        filename: `${ticketNumber}.pdf`,
      });
    }

    // Return raw PDF binary for download/preview
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${ticketNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "PDF generation failed",
      },
      { status: 500 }
    );
  }
}
