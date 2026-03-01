"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import { toast } from "sonner";
import type { Ticket, StructuredTicket, MaterialItem, AIQuestion } from "@/types";

export default function ReviewPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const router = useRouter();
  const supabase = createClient();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [fields, setFields] = useState<StructuredTicket | null>(null);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  async function loadTicket() {
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (data) {
      setTicket(data as Ticket);
      setFields(data.structured_data as StructuredTicket);
      setQuestions((data.ai_questions as AIQuestion[]) || []);
    }
    setLoading(false);
  }

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

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("tickets")
      .update({
        structured_data: fields,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Ticket saved");
    }
    setSaving(false);
  }

  async function handleContinue() {
    await handleSave();
    router.push(`/send/${ticketId}`);
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

  return (
    <div className="p-4 space-y-4">
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

      {/* AI Questions */}
      {questions.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-orange-400" />
              <span className="text-orange-400">AI Questions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {q.question}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {q.field}
                </Badge>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Edit the fields above to answer these questions
            </p>
          </CardContent>
        </Card>
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
          className="flex-1 h-12 text-base bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Send className="h-5 w-5 mr-2" />
          Send Ticket
        </Button>
      </div>
    </div>
  );
}
