import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { transcribeWithWhisper } from "@/lib/whisper";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // Auth check
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { audioPath, ticketId, mimeType } = await request.json();

    if (!audioPath || !ticketId) {
      return NextResponse.json(
        { error: "audioPath and ticketId are required" },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(ticketId)) {
      return NextResponse.json({ error: "Invalid ticketId" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Ownership check
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

    // Download audio from Supabase Storage using service role (works with private buckets)
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("audio")
      .download(audioPath);

    if (downloadError || !audioData) {
      return NextResponse.json(
        { error: `Failed to download audio: ${downloadError?.message || "unknown"}` },
        { status: 500 }
      );
    }

    const audioBuffer = Buffer.from(await audioData.arrayBuffer());

    // Transcribe with Whisper
    const transcript = await transcribeWithWhisper(
      audioBuffer,
      mimeType || "audio/webm"
    );

    // Update ticket with transcript
    await supabase
      .from("tickets")
      .update({
        raw_transcript: transcript,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 500 }
    );
  }
}
