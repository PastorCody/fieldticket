"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Mic, ArrowRight } from "lucide-react";
import type { Contact } from "@/types";

export default function OnboardingComplete() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    setContacts((data as Contact[]) || []);
    setLoading(false);
  }

  async function handleComplete() {
    setCompleting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Mark onboarding as completed
    await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // Set cookie for fast middleware check (no DB call per request)
    document.cookie =
      "ft_onboarded=1; path=/; max-age=31536000; SameSite=Lax";

    router.push("/dashboard");
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
        <div className="h-2 flex-1 rounded-full bg-orange-500" />
        <div className="h-2 flex-1 rounded-full bg-orange-500" />
      </div>

      {/* Success */}
      <div className="text-center space-y-4 py-6">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          You&apos;re all set!
        </h1>
        <p className="text-muted-foreground text-base">
          Your account is ready. Here&apos;s a summary of what you&apos;ve set
          up.
        </p>
      </div>

      {/* Summary */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <span className="text-sm text-foreground">Free trial activated</span>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <span className="text-sm text-foreground">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} added
            {contacts.length > 0 && (
              <span className="text-muted-foreground ml-1">
                ({contacts.map((c) => c.name).join(", ")})
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
          <Mic className="h-5 w-5 text-orange-500 shrink-0" />
          <span className="text-sm text-foreground">
            Ready to record your first field ticket
          </span>
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={handleComplete}
        disabled={completing}
        className="w-full h-14 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white"
      >
        {completing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Go to Dashboard
            <ArrowRight className="h-5 w-5 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
