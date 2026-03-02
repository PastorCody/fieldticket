"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  ArrowLeft,
  Save,
  Eye,
  DollarSign,
  ListPlus,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Contact,
  ContactTemplate,
  CustomFieldDef,
  PricingDefaults,
  RateType,
} from "@/types";

// Standard ticket fields that can be toggled
const STANDARD_FIELDS = [
  { key: "job_date", label: "Job Date" },
  { key: "job_type", label: "Job Type" },
  { key: "well_name", label: "Well Name" },
  { key: "lease_name", label: "Lease Name" },
  { key: "operator", label: "Operator" },
  { key: "location", label: "Location" },
  { key: "hours_worked", label: "Hours Worked" },
  { key: "start_time", label: "Start Time" },
  { key: "end_time", label: "End Time" },
  { key: "equipment_used", label: "Equipment Used" },
  { key: "materials_used", label: "Materials Used" },
  { key: "work_description", label: "Work Description" },
  { key: "safety_notes", label: "Safety Notes" },
  { key: "additional_notes", label: "Additional Notes" },
] as const;

export default function TemplatePage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [template, setTemplate] = useState<ContactTemplate | null>(null);

  // Field visibility — default all to true
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      STANDARD_FIELDS.forEach((f) => {
        initial[f.key] = true;
      });
      return initial;
    }
  );

  // Default values for standard fields
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>(
    {}
  );

  // Custom field definitions
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);

  // Pricing defaults
  const [pricingDefaults, setPricingDefaults] = useState<PricingDefaults>({
    rate_type: "none",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Load contact
    const { data: contactData } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .eq("user_id", user.id)
      .single();

    if (!contactData) {
      toast.error("Contact not found");
      router.push("/contacts");
      return;
    }

    setContact(contactData as Contact);

    // Load template
    const res = await fetch(`/api/templates?contactId=${contactId}`);
    const { template: tmpl } = await res.json();

    if (tmpl) {
      setTemplate(tmpl);
      // Merge stored visibility with defaults (new fields default to true)
      const merged: Record<string, boolean> = {};
      STANDARD_FIELDS.forEach((f) => {
        merged[f.key] =
          tmpl.visible_fields[f.key] !== undefined
            ? tmpl.visible_fields[f.key]
            : true;
      });
      setVisibleFields(merged);
      setDefaultValues(tmpl.default_values || {});
      setCustomFieldDefs(tmpl.custom_field_defs || []);
      setPricingDefaults(tmpl.pricing_defaults || { rate_type: "none" });
    }

    setLoading(false);
  }

  function toggleField(key: string) {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function updateDefault(key: string, value: string) {
    setDefaultValues((prev) => {
      if (!value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }

  function addCustomField() {
    const id = crypto.randomUUID();
    setCustomFieldDefs((prev) => [
      ...prev,
      { id, label: "", field_type: "text" },
    ]);
  }

  function updateCustomField(id: string, updates: Partial<CustomFieldDef>) {
    setCustomFieldDefs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }

  function removeCustomField(id: string) {
    setCustomFieldDefs((prev) => prev.filter((f) => f.id !== id));
  }

  function updatePricingDefault<K extends keyof PricingDefaults>(
    key: K,
    value: PricingDefaults[K]
  ) {
    setPricingDefaults((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          name: "Default",
          visible_fields: visibleFields,
          default_values: defaultValues,
          custom_field_defs: customFieldDefs.filter((f) => f.label.trim()),
          pricing_defaults: pricingDefaults,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save template");
      }

      toast.success("Template saved");
      router.push("/contacts");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save template"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/contacts")}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            Template for {contact?.name}
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            {contact?.company ? `${contact.company} · ` : ""}
            {contact?.email}
          </p>
        </div>
      </div>

      {/* Section 1: Field Visibility */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-orange-500" />
            Field Visibility
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which fields appear when creating tickets for this contact.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {STANDARD_FIELDS.map((field) => (
            <div
              key={field.key}
              className="flex items-center justify-between py-1"
            >
              <Label className="text-sm font-normal">{field.label}</Label>
              <Switch
                checked={visibleFields[field.key]}
                onCheckedChange={() => toggleField(field.key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section 2: Default Values */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-orange-500" />
            Default Values
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pre-fill fields when creating tickets for this contact. AI-extracted
            values take priority.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {STANDARD_FIELDS.filter(
            (f) =>
              visibleFields[f.key] &&
              !["equipment_used", "materials_used"].includes(f.key)
          ).map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {field.label}
              </Label>
              <Input
                value={defaultValues[field.key] || ""}
                onChange={(e) => updateDefault(field.key, e.target.value)}
                placeholder={`Default ${field.label.toLowerCase()}...`}
                className="h-9 text-sm"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section 3: Custom Field Definitions */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListPlus className="h-4 w-4 text-orange-500" />
            Custom Fields
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Define custom fields that appear on every ticket for this contact.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {customFieldDefs.map((def) => (
            <div
              key={def.id}
              className="flex items-start gap-2 p-3 rounded-lg bg-muted/50"
            >
              <div className="flex-1 space-y-2">
                <Input
                  value={def.label}
                  onChange={(e) =>
                    updateCustomField(def.id, { label: e.target.value })
                  }
                  placeholder="Field label (e.g. AFE Number)"
                  className="h-9 text-sm"
                />
                <div className="flex gap-2">
                  <select
                    value={def.field_type}
                    onChange={(e) =>
                      updateCustomField(def.id, {
                        field_type: e.target.value as "text" | "number" | "select",
                      })
                    }
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Select</option>
                  </select>
                  <Input
                    value={def.default_value || ""}
                    onChange={(e) =>
                      updateCustomField(def.id, {
                        default_value: e.target.value,
                      })
                    }
                    placeholder="Default value"
                    className="h-9 text-sm flex-1"
                  />
                </div>
                {def.field_type === "select" && (
                  <Input
                    value={(def.options || []).join(", ")}
                    onChange={(e) =>
                      updateCustomField(def.id, {
                        options: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Options (comma-separated)"
                    className="h-9 text-sm"
                  />
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCustomField(def.id)}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={addCustomField}
            className="w-full h-9 text-sm"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Custom Field
          </Button>
        </CardContent>
      </Card>

      {/* Section 4: Pricing Defaults */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-orange-500" />
            Pricing Defaults
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pre-fill pricing when creating tickets for this contact.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rate type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Default Rate Type
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {(["none", "day", "hourly", "flat"] as RateType[]).map((rt) => (
                <button
                  key={rt}
                  onClick={() => updatePricingDefault("rate_type", rt)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    pricingDefaults.rate_type === rt
                      ? "border-orange-500 bg-orange-500/10 text-orange-500"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  {rt === "none"
                    ? "None"
                    : rt === "day"
                    ? "Day"
                    : rt === "hourly"
                    ? "Hourly"
                    : "Flat"}
                </button>
              ))}
            </div>
          </div>

          {/* Rate amount */}
          {pricingDefaults.rate_type &&
            pricingDefaults.rate_type !== "none" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Default{" "}
                  {pricingDefaults.rate_type === "day"
                    ? "Day Rate"
                    : pricingDefaults.rate_type === "hourly"
                    ? "Hourly Rate"
                    : "Flat Rate"}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={
                      pricingDefaults.rate_type === "day"
                        ? pricingDefaults.day_rate || ""
                        : pricingDefaults.rate_type === "hourly"
                        ? pricingDefaults.hourly_rate || ""
                        : pricingDefaults.flat_rate || ""
                    }
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (pricingDefaults.rate_type === "day") {
                        updatePricingDefault("day_rate", val);
                      } else if (pricingDefaults.rate_type === "hourly") {
                        updatePricingDefault("hourly_rate", val);
                      } else {
                        updatePricingDefault("flat_rate", val);
                      }
                    }}
                    placeholder="0.00"
                    className="h-10 pl-7 text-sm"
                  />
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Save Button (fixed bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" /> Save Template
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
