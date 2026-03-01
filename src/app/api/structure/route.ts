import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { structureTranscript } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { transcript, ticketId } = await request.json();

    if (!transcript || !ticketId) {
      return NextResponse.json(
        { error: "transcript and ticketId are required" },
        { status: 400 }
      );
    }

    const { ticket, questions } = await structureTranscript(transcript);

    // Update ticket with structured data
    const supabase = await createServiceClient();
    await supabase
      .from("tickets")
      .update({
        structured_data: ticket,
        ai_questions: questions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    return NextResponse.json({ ticket, questions });
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
