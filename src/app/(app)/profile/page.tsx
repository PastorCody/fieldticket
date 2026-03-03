"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, Check, LogOut, PenLine } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Profile } from "@/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      if (data.logo_url) setLogoPreview(data.logo_url);
      if (data.signature_url) setSigPreview(data.signature_url);
    }
    setLoading(false);
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSigChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Signature image must be under 2MB");
      return;
    }
    setSigFile(file);
    setSigPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let logoUrl = profile.logo_url;
    let sigUrl = profile.signature_url;

    // Upload logo if changed
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${user.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(path, logoFile, { upsert: true });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("logos").getPublicUrl(path);
        logoUrl = publicUrl;
      }
    }

    // Upload signature if changed
    if (sigFile) {
      const ext = sigFile.name.split(".").pop();
      const path = `${user.id}/signature.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(path, sigFile, { upsert: true });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("signatures").getPublicUrl(path);
        sigUrl = publicUrl;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: (profile.full_name || "").trim(),
        phone: (profile.phone || "").trim() || null,
        company_name: (profile.company_name || "").trim() || null,
        logo_url: logoUrl,
        signature_url: sigUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved");
      router.push("/dashboard");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Your Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            This info appears on every field ticket you send
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-base">Full Name</Label>
              <Input
                value={profile.full_name || ""}
                onChange={(e) =>
                  setProfile({ ...profile, full_name: e.target.value })
                }
                placeholder="John Smith"
                className="h-12 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">Email</Label>
              <Input
                value={profile.email || ""}
                disabled
                className="h-12 text-base opacity-60"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">Phone</Label>
              <Input
                value={profile.phone || ""}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
                placeholder="(432) 555-1234"
                className="h-12 text-base"
                type="tel"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">Company Name</Label>
              <Input
                value={profile.company_name || ""}
                onChange={(e) =>
                  setProfile({ ...profile, company_name: e.target.value })
                }
                placeholder="West Texas Pump Service"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">Company Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-16 w-16 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">
                    <Upload className="h-4 w-4" />
                    {logoPreview ? "Change" : "Upload"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base">Signature</Label>
              <p className="text-xs text-muted-foreground">
                Appears on every PDF field ticket you send
              </p>
              <div className="flex items-center gap-4">
                {sigPreview ? (
                  <img
                    src={sigPreview}
                    alt="Signature"
                    className="h-12 w-32 object-contain border border-border rounded-lg bg-white p-1"
                  />
                ) : (
                  <div className="h-12 w-32 rounded-lg border border-dashed border-border flex items-center justify-center">
                    <PenLine className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">
                    <PenLine className="h-4 w-4" />
                    {sigPreview ? "Change" : "Upload"}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleSigChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-12 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-2" />

      <Button
        variant="ghost"
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/login");
        }}
        className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-5 w-5 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
