import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { transcribeWithWhisper } from "@/lib/whisper";
import { processQAAnswer } from "@/lib/claude";
import type { StructuredTicket } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    // Auth check
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const ticketId = formData.get("ticketId") as string;
    const field = formData.get("field") as string;
    const question = formData.get("question") as string;
    const currentFieldsRaw = formData.get("currentFields") as string;
    const audioBlob = formData.get("audio") as Blob | null;
    const mimeType = (formData.get("mimeType") as string) || "audio/webm";
    const textAnswer = formData.get("text") as string | null;

    if (!ticketId || !field || !question || !currentFieldsRaw) {
      return NextResponse.json(
        { error: "ticketId, field, question, and currentFields are required" },
        { status: 400 }
      );
    }

    if (!audioBlob && !textAnswer) {
      return NextResponse.json(
        { error: "Either audio or text answer is required" },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(ticketId)) {
      return NextResponse.json({ error: "Invalid ticketId" }, { status: 400 });
    }

    // Ownership check
    const supabase = await createServiceClient();
    const { data: ticket } = await supabase
      .from("tickets")
      .select("user_id")
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (ticket.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the answer text — either transcribe audio or use typed text
    let transcript: string;

    if (audioBlob) {
      // Transcribe audio directly (no Supabase Storage round-trip)
      const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
      transcript = await transcribeWithWhisper(audioBuffer, mimeType);
    } else {
      transcript = textAnswer!;
    }

    // Parse current fields for context
    let currentFields: StructuredTicket;
    try {
      currentFields = JSON.parse(currentFieldsRaw);
    } catch {
      return NextResponse.json(
        { error: "Invalid currentFields JSON" },
        { status: 400 }
      );
    }

    // Ask Claude to extract field updates from the answer
    const { fieldUpdates, confidence } = await processQAAnswer(
      transcript,
      field,
      question,
      currentFields
    );

    return NextResponse.json({ transcript, fieldUpdates, confidence });
  } catch (error) {
    console.error("Answer-question error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process answer",
      },
      { status: 500 }
    );
  }
}
