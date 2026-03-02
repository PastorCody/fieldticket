"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Search,
  Mail,
  Building2,
  Star,
  ArrowRight,
  Users,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import type { Contact, Ticket, StructuredTicket } from "@/types";

export default function RecipientPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const router = useRouter();
  const supabase = createClient();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [ticketId]);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Load ticket and contacts in parallel
    const [ticketRes, contactsRes] = await Promise.all([
      supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("is_favorite", { ascending: false })
        .order("name"),
    ]);

    if (!ticketRes.data) {
      toast.error("Ticket not found");
      router.push("/dashboard");
      return;
    }

    setTicket(ticketRes.data as Ticket);
    setContacts((contactsRes.data as Contact[]) || []);
    setLoading(false);
  }

  async function handleSelectContact(contact: Contact) {
    setSelecting(contact.id);

    // Set the recipient on the ticket
    const { error } = await supabase
      .from("tickets")
      .update({
        recipient_id: contact.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      toast.error("Failed to set recipient");
      setSelecting(null);
      return;
    }

    router.push(`/review/${ticketId}`);
  }

  function handleSkip() {
    router.push(`/review/${ticketId}`);
  }

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(search.toLowerCase())
  );

  // Quick summary from structured data
  const fields = ticket?.structured_data as StructuredTicket | null;
  const summary = fields
    ? [fields.job_type, fields.well_name, fields.job_date]
        .filter(Boolean)
        .join(" · ")
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center space-y-2 py-2">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
            <Users className="h-7 w-7 text-orange-500" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-foreground">
          Who&apos;s this ticket for?
        </h1>
        {summary && (
          <p className="text-sm text-muted-foreground">{summary}</p>
        )}
      </div>

      {/* Search */}
      {contacts.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="h-11 pl-10"
          />
        </div>
      )}

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-base">No contacts found</p>
          <p className="text-sm mt-1">
            Add contacts from the Contacts page first
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((contact) => (
            <Card
              key={contact.id}
              className={`border-border bg-card cursor-pointer transition-colors hover:border-orange-500/50 ${
                selecting === contact.id ? "border-orange-500 bg-orange-500/5" : ""
              }`}
              onClick={() => !selecting && handleSelectContact(contact)}
            >
              <CardContent className="flex items-center gap-3 py-3 px-4">
                {selecting === contact.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500 shrink-0" />
                ) : contact.is_favorite ? (
                  <Star className="h-5 w-5 text-orange-400 fill-orange-400 shrink-0" />
                ) : (
                  <div className="h-5 w-5 shrink-0" />
                )}
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
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Skip option */}
      <button
        onClick={handleSkip}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-orange-400 transition-colors"
      >
        <SkipForward className="h-4 w-4" />
        Skip — review without a recipient
      </button>
    </div>
  );
}
