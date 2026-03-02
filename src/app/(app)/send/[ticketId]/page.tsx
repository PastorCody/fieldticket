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
  ArrowRight,
  User,
  Building2,
  Clock,
  Calendar,
  MapPin,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import type { Ticket, Contact, StructuredTicket, Profile } from "@/types";

export default function SendPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const router = useRouter();
  const supabase = createClient();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");

  useEffect(() => {
    loadData();
  }, [ticketId]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [ticketRes, contactsRes, profileRes] = await Promise.all([
      supabase.from("tickets").select("*").eq("id", ticketId).eq("user_id", user.id).single(),
      supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("is_favorite", { ascending: false })
        .order("name"),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);

    if (!ticketRes.data) {
      toast.error("Ticket not found");
      router.push("/dashboard");
      return;
    }

    setTicket(ticketRes.data as Ticket);
    if (contactsRes.data) setContacts(contactsRes.data as Contact[]);
    if (profileRes.data) setProfile(profileRes.data as Profile);
    setLoading(false);
  }

  async function handleSend() {
    if (!selectedContact) {
      toast.error("Select a recipient first");
      return;
    }
    if (sending) return;

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

      const data = await res.json();
      setTicketNumber(data.ticketNumber || "");
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

  // ── Success Screen ──
  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 text-center">
        <CheckCircle2 className="h-20 w-20 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Field Ticket Sent!
        </h2>
        {ticketNumber && (
          <p className="text-sm text-orange-400 font-mono mb-3">
            {ticketNumber}
          </p>
        )}
        <div className="bg-card border border-border rounded-xl p-4 mb-6 max-w-sm w-full text-left space-y-3">
          <div className="flex items-start gap-3">
            <Send className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Sent to {selectedContact?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedContact?.email}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Copy className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Copy sent to you
              </p>
              <p className="text-xs text-muted-foreground">
                {profile?.email}
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Both emails include the full PDF field ticket attached.
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
      {/* Invoice Summary */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-400" />
            Your Field Ticket Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {structured && (
            <>
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>
                  <span className="text-muted-foreground">Job:</span>{" "}
                  <span className="font-medium">{structured.job_type}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>
                  <span className="text-muted-foreground">Well:</span>{" "}
                  <span className="font-medium">{structured.well_name}</span>
                  {structured.lease_name && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {structured.lease_name}
                    </span>
                  )}
                </span>
              </div>
              {structured.operator && (
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>
                    <span className="text-muted-foreground">Operator:</span>{" "}
                    <span className="font-medium">{structured.operator}</span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>
                    <span className="text-muted-foreground">Date:</span>{" "}
                    <span className="font-medium">{structured.job_date}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>
                    <span className="text-muted-foreground">Hours:</span>{" "}
                    <span className="font-medium">{structured.hours_worked}</span>
                  </span>
                </div>
              </div>
              {structured.work_description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                  {structured.work_description}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recipient Picker */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-400" />
            Send this invoice to:
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

      {/* Delivery Summary — shows after selecting a contact */}
      {selectedContact && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">
              This invoice will be sent to:
            </p>
            <div className="flex items-center gap-3 pl-2">
              <ArrowRight className="h-4 w-4 text-orange-400 shrink-0" />
              <div>
                <p className="text-sm font-medium">{selectedContact.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedContact.email}
                  {selectedContact.company && ` · ${selectedContact.company}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-2">
              <Copy className="h-4 w-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  A copy will also go to you
                </p>
                <p className="text-xs text-muted-foreground">
                  {profile?.email || "your email"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send Button */}
      <Button
        onClick={handleSend}
        disabled={!selectedContact || sending}
        className="w-full h-14 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
      >
        {sending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Sending to both...
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
