"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Mic, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Profile } from "@/types";

export default function OnboardingStep1() {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setFullName(data.full_name || "");
      setCompanyName(data.company_name || "");

      // If already onboarded, set cookie and skip to dashboard
      if (data.onboarding_completed) {
        document.cookie =
          "ft_onboarded=1; path=/; max-age=31536000; SameSite=Lax";
        router.push("/dashboard");
        return;
      }
    }
    setLoading(false);
  }

  async function handleStartTrial() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        company_name: companyName.trim() || null,
        trial_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setSaving(false);
      return;
    }

    router.push("/onboarding/contacts");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 rounded-full bg-orange-500" />
        <div className="h-2 flex-1 rounded-full bg-muted" />
        <div className="h-2 flex-1 rounded-full bg-muted" />
      </div>

      {/* Welcome */}
      <div className="text-center space-y-3 py-4">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500/10">
            <Mic className="h-10 w-10 text-orange-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome to FieldTicket
        </h1>
        <p className="text-muted-foreground text-base">
          Voice-first field tickets for the oilfield. Record your work, and
          we&apos;ll handle the rest.
        </p>
      </div>

      {/* Features */}
      <div className="space-y-3">
        {[
          "Record field tickets with your voice",
          "AI extracts all the details automatically",
          "Professional PDFs sent to your contacts",
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-orange-500 shrink-0" />
            <span className="text-sm text-foreground">{feature}</span>
          </div>
        ))}
      </div>

      {/* Profile fields */}
      <Card className="border-border bg-card">
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-base">Your Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
              className="h-12 text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Company Name</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="West Texas Pump Service"
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground">
              Optional — appears on your field tickets
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button
        onClick={handleStartTrial}
        disabled={saving || !fullName.trim()}
        className="w-full h-14 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white"
      >
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Start Your Free Trial
            <ArrowRight className="h-5 w-5 ml-2" />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        No credit card required. Try it free, cancel anytime.
      </p>
    </div>
  );
}
