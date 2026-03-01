"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Send,
  CheckCircle2,
  Mail,
  FileText,
  Search,
  Star,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import type { Ticket, Contact, StructuredTicket } from "@/types";

export default function SendPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const router = useRouter();
  const supabase = createClient();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    loadData();
  }, [ticketId]);

  async function loadData() {
    const [ticketRes, contactsRes] = await Promise.all([
      supabase.from("tickets").select("*").eq("id", ticketId).single(),
      supabase
        .from("contacts")
        .select("*")
        .order("is_favorite", { ascending: false })
        .order("name"),
    ]);

    if (ticketRes.data) setTicket(ticketRes.data as Ticket);
    if (contactsRes.data) setContacts(contactsRes.data as Contact[]);
    setLoading(false);
  }

  async function handleSend() {
    if (!selectedContact) {
      toast.error("Select a recipient first");
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          recipientId: selectedContact.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }

      setSent(true);
      toast.success("Field ticket sent!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send ticket"
      );
    }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 text-center">
        <CheckCircle2 className="h-20 w-20 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Ticket Sent!</h2>
        <p className="text-muted-foreground mb-6">
          Your field ticket has been emailed to {selectedContact?.name}
        </p>
        <Button
          onClick={() => router.push("/dashboard")}
          className="bg-orange-500 hover:bg-orange-600 text-white h-12 px-8 text-base"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const structured = ticket?.structured_data as StructuredTicket | null;

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      {/* Ticket Summary */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-400" />
            Sending Field Ticket
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          {structured && (
            <>
              <p>
                <span className="text-muted-foreground">Job:</span>{" "}
                {structured.job_type} — {structured.well_name}
              </p>
              <p>
                <span className="text-muted-foreground">Date:</span>{" "}
                {structured.job_date}
              </p>
              <p>
                <span className="text-muted-foreground">Hours:</span>{" "}
                {structured.hours_worked}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recipient Picker */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-400" />
            Who should this go to?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="h-10 pl-10"
            />
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {filtered.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  selectedContact?.id === contact.id
                    ? "bg-orange-500/10 border border-orange-500/30"
                    : "hover:bg-secondary"
                }`}
              >
                {contact.is_favorite && (
                  <Star className="h-4 w-4 text-orange-400 fill-orange-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{contact.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {contact.email}
                    {contact.company && ` · ${contact.company}`}
                  </p>
                </div>
                {selectedContact?.id === contact.id && (
                  <CheckCircle2 className="h-5 w-5 text-orange-500 shrink-0" />
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No contacts found.{" "}
                <button
                  onClick={() => router.push("/contacts")}
                  className="text-orange-400 hover:underline"
                >
                  Add one
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Send Button */}
      <Button
        onClick={handleSend}
        disabled={!selectedContact || sending}
        className="w-full h-14 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
      >
        {sending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-5 w-5 mr-2" />
            Send Field Ticket
          </>
        )}
      </Button>
    </div>
  );
}
