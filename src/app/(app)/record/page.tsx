"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useWaveform } from "@/hooks/use-waveform";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export default function RecordPage() {
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const {
    isRecording,
    duration,
    audioBlob,
    analyserRef,
    startRecording,
    stopRecording,
  } = useAudioRecorder();
  const canvasRef = useWaveform(analyserRef, isRecording);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function handleMicClick() {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch {
        toast.error("Microphone access denied. Check your browser settings.");
      }
    }
  }

  async function handleProcess() {
    if (!audioBlob) return;
    setProcessing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ticketId = uuidv4();
      setStatus("Uploading audio...");

      // Upload audio to Supabase Storage
      const ext = audioBlob.type.includes("mp4") ? "mp4" : "webm";
      const audioPath = `${user.id}/${ticketId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(audioPath, audioBlob);

      if (uploadError) throw uploadError;

      // Create draft ticket with storage path (not public URL — bucket may be private)
      const { error: insertError } = await supabase.from("tickets").insert({
        id: ticketId,
        user_id: user.id,
        status: "draft",
        audio_url: audioPath,
      });

      if (insertError) throw insertError;

      // Transcribe
      setStatus("Transcribing your recording...");
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioPath, ticketId, mimeType: audioBlob.type }),
      });

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json();
        throw new Error(err.error || "Transcription failed");
      }

      const { transcript } = await transcribeRes.json();

      // Structure with AI
      setStatus("AI is organizing your ticket...");
      const structureRes = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, ticketId }),
      });

      if (!structureRes.ok) {
        const err = await structureRes.json();
        throw new Error(err.error || "AI structuring failed");
      }

      toast.success("Ticket created! Choose a recipient.");
      router.push(`/recipient/${ticketId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
      setProcessing(false);
      setStatus("");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      {/* Status text */}
      <div className="text-center mb-8">
        {processing ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground">{status}</p>
          </>
        ) : isRecording ? (
          <>
            <p className="text-lg font-medium text-orange-400">Recording...</p>
            <p className="text-4xl font-mono font-bold text-foreground mt-2">
              {formatTime(duration)}
            </p>
          </>
        ) : audioBlob ? (
          <>
            <p className="text-lg font-medium text-foreground">
              Recording complete
            </p>
            <p className="text-2xl font-mono text-muted-foreground mt-1">
              {formatTime(duration)}
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-semibold text-foreground">
              Record Your Job
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Tap the mic and describe what you did
            </p>
          </>
        )}
      </div>

      {/* Waveform */}
      <div className="w-full max-w-sm h-24 mb-8">
        <canvas
          ref={canvasRef}
          width={350}
          height={96}
          className="w-full h-full"
        />
      </div>

      {/* Giant Mic Button */}
      {!processing && !audioBlob && (
        <div className="relative">
          {isRecording && (
            <div className="absolute inset-0 rounded-full bg-orange-500/30 mic-pulse" />
          )}
          <button
            onClick={handleMicClick}
            className={`relative z-10 flex h-32 w-32 items-center justify-center rounded-full transition-all active:scale-95 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.4)]"
                : "bg-orange-500 hover:bg-orange-600 shadow-[0_0_40px_rgba(255,107,53,0.3)]"
            }`}
          >
            {isRecording ? (
              <Square className="h-12 w-12 text-white" fill="white" />
            ) : (
              <Mic className="h-14 w-14 text-white" />
            )}
          </button>
        </div>
      )}

      {/* Process button after recording */}
      {audioBlob && !processing && (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            onClick={handleProcess}
            className="flex items-center justify-center gap-2 h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold transition-colors active:scale-[0.98]"
          >
            Create Field Ticket
          </button>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Record again
          </button>
        </div>
      )}
    </div>
  );
}
