"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Plus,
  ArrowRight,
  Mail,
  Building2,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/types";

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  company: string;
}

const emptyForm: ContactForm = { name: "", email: "", phone: "", company: "" };

export default function OnboardingContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
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

    // Auto-show form if no contacts
    if (!data || data.length === 0) {
      setShowForm(true);
    }
  }

  async function handleAddContact() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("contacts").insert({
      user_id: user.id,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
    });

    if (error) {
      toast.error("Failed to add contact");
      setSaving(false);
      return;
    }

    toast.success(`${form.name.trim()} added`);
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    loadContacts();
  }

  async function handleDelete(contact: Contact) {
    await supabase.from("contacts").delete().eq("id", contact.id);
    toast.success(`${contact.name} removed`);
    loadContacts();
  }

  function handleContinue() {
    router.push("/onboarding/complete");
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
        <div className="h-2 flex-1 rounded-full bg-muted" />
      </div>

      {/* Header */}
      <div className="text-center space-y-2 py-2">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10">
            <Users className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Who do you send tickets to?
        </h1>
        <p className="text-muted-foreground text-sm">
          Add the people who receive your field tickets. You can always add more
          later.
        </p>
      </div>

      {/* Added contacts */}
      {contacts.length > 0 && (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className="border-border bg-card">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {contact.name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </span>
                    {contact.company && (
                      <span className="flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3" />
                        {contact.company}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(contact)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add contact form */}
      {showForm ? (
        <Card className="border-border bg-card border-orange-500/30">
          <CardContent className="pt-5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Doe"
                className="h-11"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@company.com"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Phone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(432) 555-5678"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Company</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Permian Basin Oil Co"
                className="h-11"
              />
            </div>
            <div className="flex gap-2 pt-1">
              {contacts.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setForm(emptyForm);
                  }}
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleAddContact}
                disabled={saving || !form.name.trim() || !form.email.trim()}
                className="flex-1 h-11 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add Contact"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full h-12 border-dashed border-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Contact
        </Button>
      )}

      {/* Continue */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={handleContinue}
          disabled={contacts.length === 0}
          className="w-full h-14 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white"
        >
          Continue
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>

        {contacts.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Add at least one contact to continue
          </p>
        )}

        <button
          onClick={handleContinue}
          className="w-full text-center text-sm text-muted-foreground hover:text-orange-400 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
