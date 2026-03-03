"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAutosave } from "@/hooks/use-autosave";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Save,
  Send,
  MessageCircle,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Building2,
  User,
  Mail,
  Download,
  ArrowLeft,
  Copy,
  Wrench,
  Package,
  Shield,
  StickyNote,
  Mic,
  Square,
  List,
  ChevronRight,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Ticket,
  StructuredTicket,
  MaterialItem,
  AIQuestion,
  CustomField,
  Contact,
  Profile,
  PricingData,
  PricingLineItem,
  RateType,
  ContactTemplate,
} from "@/types";

// ── Inline Q&A Answer Block ──
type QAStatus = "idle" | "recording" | "transcribing" | "processing" | "answered" | "error";

function QAAnswerBlock({
  question,
  ticketId,
  currentFields,
  existingAnswer,
  onFieldUpdate,
  onAnswerSaved,
}: {
  question: AIQuestion;
  ticketId: string;
  currentFields: StructuredTicket;
  existingAnswer?: string;
  onFieldUpdate: (updates: Record<string, unknown>) => void;
  onAnswerSaved: (field: string, answer: string) => void;
}) {
  const [status, setStatus] = useState<QAStatus>(existingAnswer ? "answered" : "idle");
  const [answer, setAnswer] = useState(existingAnswer || "");
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await processAudio(blob, mimeType);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setStatus("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setError("Microphone access denied");
      setStatus("error");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus("transcribing");
  }

  async function processAudio(blob: Blob, mimeType: string) {
    setStatus("transcribing");
    try {
      const formData = new FormData();
      formData.append("audio", blob);
      formData.append("mimeType", mimeType);
      formData.append("field", question.field);
      formData.append("question", question.question);
      formData.append("ticketId", ticketId);
      formData.append("currentFields", JSON.stringify(currentFields));

      const res = await fetch("/api/answer-question", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process answer");
      }

      const data = await res.json();
      setAnswer(data.transcript);
      setStatus("answered");
      onFieldUpdate(data.fieldUpdates);
      onAnswerSaved(question.field, data.transcript);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process");
      setStatus("error");
    }
  }

  async function handleTextSubmit() {
    if (!textInput.trim()) return;
    setStatus("processing");
    try {
      const formData = new FormData();
      formData.append("text", textInput.trim());
      formData.append("field", question.field);
      formData.append("question", question.question);
      formData.append("ticketId", ticketId);
      formData.append("currentFields", JSON.stringify(currentFields));

      const res = await fetch("/api/answer-question", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process answer");
      }

      const data = await res.json();
      setAnswer(data.transcript || textInput.trim());
      setStatus("answered");
      setTextInput("");
      onFieldUpdate(data.fieldUpdates);
      onAnswerSaved(question.field, data.transcript || textInput.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process");
      setStatus("error");
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="space-y-2 pb-3 border-b border-orange-500/10 last:border-0 last:pb-0">
      <div className="flex items-start gap-2">
        <ChevronRight className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{question.question}</p>
          <Badge variant="secondary" className="text-xs mt-1">{question.field}</Badge>
        </div>
      </div>

      {/* Answered state */}
      {status === "answered" && (
        <div className="flex items-start gap-2 ml-6">
          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-400">{answer}</p>
        </div>
      )}

      {/* Recording state */}
      {status === "recording" && (
        <div className="flex items-center gap-3 ml-6">
          <button
            onClick={stopRecording}
            className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse"
          >
            <Square className="h-4 w-4 text-white fill-white" />
          </button>
          <span className="text-sm text-red-400 font-mono">
            {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
          </span>
          <span className="text-xs text-muted-foreground">Tap to stop</span>
        </div>
      )}

      {/* Transcribing / Processing state */}
      {(status === "transcribing" || status === "processing") && (
        <div className="flex items-center gap-2 ml-6">
          <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
          <span className="text-sm text-muted-foreground">
            {status === "transcribing" ? "Transcribing..." : "Processing answer..."}
          </span>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="ml-6 space-y-2">
          <p className="text-sm text-red-400">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setStatus("idle"); setError(""); }}
            className="text-orange-400"
          >
            Try again
          </Button>
        </div>
      )}

      {/* Idle state — show input + mic */}
      {status === "idle" && (
        <div className="flex gap-2 ml-6">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
            placeholder="Type or tap mic to answer..."
            className="h-10 flex-1 text-sm"
          />
          {textInput.trim() ? (
            <Button
              size="icon"
              onClick={handleTextSubmit}
              className="h-10 w-10 bg-orange-500 hover:bg-orange-600 text-white shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <button
              onClick={startRecording}
              className="h-10 w-10 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center shrink-0 transition-colors"
            >
              <Mic className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReviewPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const router = useRouter();
  const supabase = createClient();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [fields, setFields] = useState<StructuredTicket | null>(null);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [contact, setContact] = useState<Contact | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [aiAnswers, setAiAnswers] = useState<Record<string, string>>({});
  const [pricing, setPricing] = useState<PricingData>({
    rate_type: "none",
    line_items: [],
  });
  const [template, setTemplate] = useState<ContactTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Autosave ──
  const silentSave = useCallback(async (): Promise<boolean> => {
    if (!fields || saving) return false;
    const { error } = await supabase
      .from("tickets")
      .update({
        structured_data: fields,
        ai_answers: aiAnswers,
        pricing_data:
          pricing.rate_type !== "none" || pricing.line_items.length > 0
            ? pricing
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);
    return !error;
  }, [fields, aiAnswers, pricing, ticketId, saving, supabase]);

  const autosaveData = { fields, aiAnswers, pricing };
  const { isDirty, lastSaved, isSaving: isAutoSaving } = useAutosave(
    autosaveData,
    silentSave,
    { delayMs: 3000, enabled: !loading && !!fields && ticket?.status === "draft" }
  );

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  async function loadTicket() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .single();

    if (!data) {
      toast.error("Ticket not found");
      router.push("/dashboard");
      return;
    }

    const ticketData = data as Ticket;
    setTicket(ticketData);
    setFields(ticketData.structured_data as StructuredTicket);
    setQuestions((ticketData.ai_questions as AIQuestion[]) || []);
    setAiAnswers((ticketData.ai_answers as Record<string, string>) || {});

    // Load existing pricing data from ticket
    if (ticketData.pricing_data) {
      setPricing(ticketData.pricing_data as PricingData);
    }

    // Load recipient contact info
    if (ticketData.recipient_id) {
      const { data: contactData } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", ticketData.recipient_id)
        .single();
      if (contactData) setContact(contactData as Contact);

      // Load template for this contact (draft only)
      if (ticketData.status === "draft") {
        try {
          const templateRes = await fetch(
            `/api/templates?contactId=${ticketData.recipient_id}`
          );
          if (templateRes.ok) {
            const { template: tmpl } = await templateRes.json();
            if (tmpl) {
              setTemplate(tmpl as ContactTemplate);
              // Apply pricing defaults if no pricing data on ticket yet
              if (!ticketData.pricing_data && tmpl.pricing_defaults?.rate_type) {
                setPricing({
                  rate_type: tmpl.pricing_defaults.rate_type || "none",
                  day_rate: tmpl.pricing_defaults.day_rate,
                  hourly_rate: tmpl.pricing_defaults.hourly_rate,
                  flat_rate: tmpl.pricing_defaults.flat_rate,
                  line_items: (tmpl.pricing_defaults.default_line_items || []).map(
                    (li: { description: string; quantity: number; unit_price: number }, i: number) => ({
                      id: crypto.randomUUID(),
                      description: li.description,
                      quantity: li.quantity,
                      unit_price: li.unit_price,
                      total: li.quantity * li.unit_price,
                    })
                  ),
                });
              }
            }
          }
        } catch {
          // Template load failed, continue without it
        }
      }
    }

    // If ticket is sent, also load profile for display
    if (ticketData.status === "sent" || ticketData.status === "viewed") {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) setProfile(profileData as Profile);
    }
    setLoading(false);
  }

  // ── Edit helpers (only used for draft tickets) ──

  function updateField(key: keyof StructuredTicket, value: unknown) {
    if (!fields) return;
    setFields({ ...fields, [key]: value });
  }

  function updateMaterial(
    index: number,
    key: keyof MaterialItem,
    value: string | number
  ) {
    if (!fields) return;
    const updated = [...fields.materials_used];
    updated[index] = { ...updated[index], [key]: value };
    setFields({ ...fields, materials_used: updated });
  }

  function addMaterial() {
    if (!fields) return;
    setFields({
      ...fields,
      materials_used: [
        ...fields.materials_used,
        { item: "", quantity: 1, unit: "ea" },
      ],
    });
  }

  function removeMaterial(index: number) {
    if (!fields) return;
    setFields({
      ...fields,
      materials_used: fields.materials_used.filter((_, i) => i !== index),
    });
  }

  function updateEquipment(index: number, value: string) {
    if (!fields) return;
    const updated = [...fields.equipment_used];
    updated[index] = value;
    setFields({ ...fields, equipment_used: updated });
  }

  function addEquipment() {
    if (!fields) return;
    setFields({
      ...fields,
      equipment_used: [...fields.equipment_used, ""],
    });
  }

  function removeEquipment(index: number) {
    if (!fields) return;
    setFields({
      ...fields,
      equipment_used: fields.equipment_used.filter((_, i) => i !== index),
    });
  }

  // ── Custom Field helpers ──
  function addCustomField() {
    if (!fields) return;
    const custom = fields.custom_fields || [];
    setFields({
      ...fields,
      custom_fields: [
        ...custom,
        { id: crypto.randomUUID(), label: "", value: "" },
      ],
    });
  }

  function updateCustomField(
    id: string,
    key: "label" | "value",
    val: string
  ) {
    if (!fields) return;
    const custom = (fields.custom_fields || []).map((f) =>
      f.id === id ? { ...f, [key]: val } : f
    );
    setFields({ ...fields, custom_fields: custom });
  }

  function removeCustomField(id: string) {
    if (!fields) return;
    setFields({
      ...fields,
      custom_fields: (fields.custom_fields || []).filter((f) => f.id !== id),
    });
  }

  // ── Pricing helpers ──
  function updatePricing(updates: Partial<PricingData>) {
    setPricing((prev) => {
      const updated = { ...prev, ...updates };
      // Recalculate subtotal and total
      const lineItemsTotal = updated.line_items.reduce(
        (sum, li) => sum + li.total,
        0
      );
      let rateAmount = 0;
      if (updated.rate_type === "day" && updated.day_rate) {
        rateAmount = updated.day_rate;
      } else if (
        updated.rate_type === "hourly" &&
        updated.hourly_rate &&
        fields
      ) {
        rateAmount = updated.hourly_rate * (fields.hours_worked || 0);
      } else if (updated.rate_type === "flat" && updated.flat_rate) {
        rateAmount = updated.flat_rate;
      }
      updated.subtotal = rateAmount;
      updated.total = rateAmount + lineItemsTotal;
      return updated;
    });
  }

  function addLineItem() {
    const newItem: PricingLineItem = {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit_price: 0,
      total: 0,
    };
    updatePricing({ line_items: [...pricing.line_items, newItem] });
  }

  function updateLineItem(
    id: string,
    key: keyof PricingLineItem,
    value: string | number
  ) {
    const updated = pricing.line_items.map((li) => {
      if (li.id !== id) return li;
      const item = { ...li, [key]: value };
      item.total = item.quantity * item.unit_price;
      return item;
    });
    updatePricing({ line_items: updated });
  }

  function removeLineItem(id: string) {
    updatePricing({
      line_items: pricing.line_items.filter((li) => li.id !== id),
    });
  }

  // ── Q&A Answer handlers ──
  function handleQAFieldUpdate(updates: Record<string, unknown>) {
    if (!fields) return;
    setFields({ ...fields, ...updates });
  }

  function handleAnswerSaved(field: string, answer: string) {
    const updated = { ...aiAnswers, [field]: answer };
    setAiAnswers(updated);
    supabase
      .from("tickets")
      .update({ ai_answers: updated, updated_at: new Date().toISOString() })
      .eq("id", ticketId);
  }

  async function handleSave(): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    const { error } = await supabase
      .from("tickets")
      .update({
        structured_data: fields,
        ai_answers: aiAnswers,
        pricing_data: pricing.rate_type !== "none" || pricing.line_items.length > 0
          ? pricing
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      toast.error("Failed to save");
      setSaving(false);
      return false;
    }
    toast.success("Ticket saved");
    setSaving(false);
    return true;
  }

  async function handleContinue() {
    const success = await handleSave();
    if (success) {
      router.push(`/send/${ticketId}`);
    }
  }

  async function handleDownloadPdf() {
    if (!ticket?.pdf_url) {
      toast.error("PDF not available yet");
      return;
    }
    const { data, error } = await supabase.storage
      .from("pdfs")
      .download(ticket.pdf_url);
    if (error || !data) {
      toast.error("Failed to download PDF");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = ticket.pdf_url.split("/").pop() || "field-ticket.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!ticket || !fields) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Ticket not found
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // SENT TICKET — Read-only detail view
  // ════════════════════════════════════════════════════
  if (ticket.status === "sent" || ticket.status === "viewed") {
    const ticketDate = new Date(ticket.created_at);
    const dateStr = `${ticketDate.getFullYear()}${String(ticketDate.getMonth() + 1).padStart(2, "0")}${String(ticketDate.getDate()).padStart(2, "0")}`;
    const ticketNumber = `FT-${dateStr}-${ticketId.slice(0, 8).toUpperCase()}`;

    return (
      <div className="p-4 space-y-4">
        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tickets
        </button>

        {/* Header */}
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Field Ticket Sent
                </h2>
                <p className="text-xs font-mono text-orange-400">
                  {ticketNumber}
                </p>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="space-y-2 mt-3">
              <div className="flex items-start gap-3">
                <Send className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Sent to {contact?.name || "recipient"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {contact?.email}
                    {contact?.company && ` · ${contact.company}`}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Copy className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Copy sent to you</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.email}
                  </p>
                </div>
              </div>
              {ticket.sent_at && (
                <p className="text-xs text-muted-foreground pl-7">
                  Sent on{" "}
                  {new Date(ticket.sent_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PDF Download */}
        {ticket.pdf_url && (
          <Button
            onClick={handleDownloadPdf}
            variant="secondary"
            className="w-full h-12 text-base"
          >
            <Download className="h-5 w-5 mr-2" />
            Download PDF
          </Button>
        )}

        {/* Job Details */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-orange-400 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Job Type</p>
                <p className="font-medium">{fields.job_type || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{fields.job_date || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Well</p>
                <p className="font-medium">{fields.well_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lease</p>
                <p className="font-medium">{fields.lease_name || "—"}</p>
              </div>
            </div>
            {fields.operator && (
              <div>
                <p className="text-xs text-muted-foreground">Operator</p>
                <p className="font-medium">{fields.operator}</p>
              </div>
            )}
            {fields.location && (
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{fields.location}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-orange-400 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Start</p>
                <p className="font-medium">{fields.start_time || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End</p>
                <p className="font-medium">{fields.end_time || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="font-medium text-orange-400">
                  {fields.hours_worked || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Description */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-orange-400 flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Work Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {fields.work_description || "No description provided"}
            </p>
          </CardContent>
        </Card>

        {/* Equipment */}
        {(fields.equipment_used ?? []).length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-orange-400 flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Equipment Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {fields.equipment_used.map((item, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Materials */}
        {(fields.materials_used ?? []).length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-orange-400 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Materials Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fields.materials_used.map((mat, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm border-b border-border/50 pb-1 last:border-0"
                  >
                    <span>{mat.item}</span>
                    <span className="text-muted-foreground font-mono">
                      {mat.quantity} {mat.unit}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Safety & Notes */}
        {(fields.safety_notes || fields.additional_notes) && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-orange-400 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {fields.safety_notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Safety Notes
                  </p>
                  <p className="whitespace-pre-wrap">{fields.safety_notes}</p>
                </div>
              )}
              {fields.additional_notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Additional Notes
                  </p>
                  <p className="whitespace-pre-wrap">
                    {fields.additional_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Custom Fields */}
        {(fields.custom_fields ?? []).length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-orange-400 flex items-center gap-2">
                <List className="h-5 w-5" />
                Custom Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {fields.custom_fields!.map((cf) => (
                <div key={cf.id} className="flex justify-between border-b border-border/50 pb-1 last:border-0">
                  <span className="text-muted-foreground">{cf.label}</span>
                  <span className="font-medium">{cf.value || "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Resend option */}
        <div className="pb-4">
          <Button
            onClick={() => router.push(`/send/${ticketId}`)}
            variant="secondary"
            className="w-full h-12 text-base"
          >
            <Send className="h-5 w-5 mr-2" />
            Resend This Ticket
          </Button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // DRAFT TICKET — Editable form
  // ════════════════════════════════════════════════════
  return (
    <div className="p-4 space-y-4">
      {/* AI Questions — Interactive Q&A at top */}
      {questions.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-orange-400" />
              <span className="text-orange-400">AI Questions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q, i) => (
              <QAAnswerBlock
                key={i}
                question={q}
                ticketId={ticketId}
                currentFields={fields}
                existingAnswer={aiAnswers[q.field]}
                onFieldUpdate={handleQAFieldUpdate}
                onAnswerSaved={handleAnswerSaved}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Job Info */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-orange-400">
            Job Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={fields.job_date}
                onChange={(e) => updateField("job_date", e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Job Type</Label>
              <Input
                value={fields.job_type}
                onChange={(e) => updateField("job_type", e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                Well Name
              </Label>
              <Input
                value={fields.well_name}
                onChange={(e) => updateField("well_name", e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Lease Name
              </Label>
              <Input
                value={fields.lease_name}
                onChange={(e) => updateField("lease_name", e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Operator</Label>
            <Input
              value={fields.operator}
              onChange={(e) => updateField("operator", e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Input
              value={fields.location}
              onChange={(e) => updateField("location", e.target.value)}
              className="h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Time */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-orange-400">Time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="time"
                value={fields.start_time}
                onChange={(e) => updateField("start_time", e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End</Label>
              <Input
                type="time"
                value={fields.end_time}
                onChange={(e) => updateField("end_time", e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Total Hours
              </Label>
              <Input
                type="number"
                step="0.5"
                value={fields.hours_worked}
                onChange={(e) =>
                  updateField("hours_worked", parseFloat(e.target.value) || 0)
                }
                className="h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Description */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-orange-400">
            Work Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={fields.work_description}
            onChange={(e) => updateField("work_description", e.target.value)}
            rows={4}
            className="text-base"
          />
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-orange-400">Equipment</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={addEquipment}
            className="text-orange-400 hover:text-orange-300"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {fields.equipment_used.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => updateEquipment(i, e.target.value)}
                className="h-10 flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeEquipment(i)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {fields.equipment_used.length === 0 && (
            <p className="text-sm text-muted-foreground">No equipment listed</p>
          )}
        </CardContent>
      </Card>

      {/* Materials */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-orange-400">Materials</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={addMaterial}
            className="text-orange-400 hover:text-orange-300"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.materials_used.map((mat, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <Input
                  value={mat.item}
                  onChange={(e) => updateMaterial(i, "item", e.target.value)}
                  placeholder="Item"
                  className="h-10"
                />
              </div>
              <Input
                type="number"
                value={mat.quantity}
                onChange={(e) =>
                  updateMaterial(i, "quantity", parseFloat(e.target.value) || 0)
                }
                className="h-10 w-20"
              />
              <Input
                value={mat.unit}
                onChange={(e) => updateMaterial(i, "unit", e.target.value)}
                placeholder="unit"
                className="h-10 w-20"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeMaterial(i)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {fields.materials_used.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No materials listed
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-orange-400 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rate Type */}
          <div>
            <Label className="text-xs text-muted-foreground">Rate Type</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {(["none", "day", "hourly", "flat"] as RateType[]).map((rt) => (
                <button
                  key={rt}
                  onClick={() => updatePricing({ rate_type: rt })}
                  className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                    pricing.rate_type === rt
                      ? "bg-orange-500 text-white"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {rt === "none" ? "None" : rt === "day" ? "Day" : rt === "hourly" ? "Hourly" : "Flat"}
                </button>
              ))}
            </div>
          </div>

          {/* Rate Amount */}
          {pricing.rate_type !== "none" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  {pricing.rate_type === "day"
                    ? "Day Rate ($)"
                    : pricing.rate_type === "hourly"
                    ? "Hourly Rate ($)"
                    : "Flat Rate ($)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={
                    pricing.rate_type === "day"
                      ? pricing.day_rate || ""
                      : pricing.rate_type === "hourly"
                      ? pricing.hourly_rate || ""
                      : pricing.flat_rate || ""
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (pricing.rate_type === "day")
                      updatePricing({ day_rate: val });
                    else if (pricing.rate_type === "hourly")
                      updatePricing({ hourly_rate: val });
                    else updatePricing({ flat_rate: val });
                  }}
                  className="h-10"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Subtotal
                </Label>
                <div className="h-10 flex items-center px-3 rounded-md bg-secondary text-foreground font-mono">
                  ${(pricing.subtotal || 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">
                Line Items
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addLineItem}
                className="text-orange-400 hover:text-orange-300 h-7"
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {pricing.line_items.map((li) => (
              <div key={li.id} className="flex gap-2 mb-2">
                <Input
                  value={li.description}
                  onChange={(e) =>
                    updateLineItem(li.id, "description", e.target.value)
                  }
                  placeholder="Description"
                  className="h-9 flex-1 text-sm"
                />
                <Input
                  type="number"
                  value={li.quantity}
                  onChange={(e) =>
                    updateLineItem(
                      li.id,
                      "quantity",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="h-9 w-16 text-sm"
                  placeholder="Qty"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={li.unit_price}
                  onChange={(e) =>
                    updateLineItem(
                      li.id,
                      "unit_price",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="h-9 w-20 text-sm"
                  placeholder="Price"
                />
                <span className="h-9 flex items-center text-xs text-muted-foreground font-mono w-16 justify-end">
                  ${li.total.toFixed(2)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(li.id)}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Total */}
          {(pricing.rate_type !== "none" || pricing.line_items.length > 0) && (
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-lg font-bold text-orange-400 font-mono">
                ${(pricing.total || 0).toFixed(2)}
              </span>
            </div>
          )}

          {/* Pricing Notes */}
          <div>
            <Label className="text-xs text-muted-foreground">
              PO #, AFE #, or Notes
            </Label>
            <Input
              value={pricing.notes || ""}
              onChange={(e) => updatePricing({ notes: e.target.value })}
              placeholder="PO-12345, AFE-67890"
              className="h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-orange-400">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">
              Safety Notes
            </Label>
            <Textarea
              value={fields.safety_notes}
              onChange={(e) => updateField("safety_notes", e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Additional Notes
            </Label>
            <Textarea
              value={fields.additional_notes}
              onChange={(e) =>
                updateField("additional_notes", e.target.value)
              }
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-orange-400 flex items-center gap-2">
            <List className="h-5 w-5" />
            Custom Fields
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={addCustomField}
            className="text-orange-400 hover:text-orange-300"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {(fields.custom_fields || []).map((cf) => (
            <div key={cf.id} className="flex gap-2">
              <Input
                value={cf.label}
                onChange={(e) =>
                  updateCustomField(cf.id, "label", e.target.value)
                }
                placeholder="Field name"
                className="h-10 flex-[2]"
              />
              <Input
                value={cf.value}
                onChange={(e) =>
                  updateCustomField(cf.id, "value", e.target.value)
                }
                placeholder="Value"
                className="h-10 flex-[3]"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCustomField(cf.id)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(fields.custom_fields || []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add custom fields for job-specific data
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recipient summary (if set from recipient step) */}
      {contact && ticket.status === "draft" && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="py-3 flex items-center gap-3">
            <Send className="h-5 w-5 text-orange-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Sending to {contact.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {contact.email}
                {contact.company ? ` · ${contact.company}` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/recipient/${ticketId}`)}
              className="text-xs text-muted-foreground shrink-0"
            >
              Change
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Autosave status */}
      {ticket?.status === "draft" && (
        <div className="flex items-center justify-center gap-2 text-xs pb-1">
          {isAutoSaving ? (
            <span className="text-orange-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          ) : isDirty ? (
            <span className="text-yellow-400">Unsaved changes</span>
          ) : lastSaved ? (
            <span className="text-green-400">
              Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </span>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-4">
        <Button
          variant="secondary"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-12 text-base"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Draft
            </>
          )}
        </Button>
        <Button
          onClick={handleContinue}
          disabled={saving}
          className="flex-1 h-12 text-base bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Send className="h-5 w-5 mr-2" />
          Send Ticket
        </Button>
      </div>
    </div>
  );
}
