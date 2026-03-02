import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { structureTranscript } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    // Auth check
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transcript, ticketId } = await request.json();

    if (!transcript || !ticketId) {
      return NextResponse.json(
        { error: "transcript and ticketId are required" },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(ticketId)) {
      return NextResponse.json({ error: "Invalid ticketId" }, { status: 400 });
    }

    // Ownership check
    const supabase = await createServiceClient();
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("user_id")
      .eq("id", ticketId)
      .single();

    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (existingTicket.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { ticket, questions, pricing } = await structureTranscript(transcript);
    await supabase
      .from("tickets")
      .update({
        structured_data: ticket,
        ai_questions: questions,
        pricing_data: pricing || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    return NextResponse.json({ ticket, questions, pricing });
  } catch (error) {
    console.error("Structuring error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "AI structuring failed",
      },
      { status: 500 }
    );
  }
}
