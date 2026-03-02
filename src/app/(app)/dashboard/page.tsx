"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Plus,
  FileText,
  Send,
  Eye,
  Search,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Ticket, StructuredTicket, Contact } from "@/types";

interface TicketWithContact extends Ticket {
  contacts: Contact | null;
}

const statusConfig = {
  draft: { label: "Draft", color: "bg-zinc-600 text-zinc-100", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-600 text-blue-100", icon: Send },
  viewed: { label: "Viewed", color: "bg-green-600 text-green-100", icon: Eye },
};

export default function DashboardPage() {
  const [tickets, setTickets] = useState<TicketWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("tickets")
      .select("*, contacts(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setTickets((data as TicketWithContact[]) || []);
    setLoading(false);
  }

  function filterTickets(tickets: TicketWithContact[]) {
    let filtered = tickets;

    if (tab !== "all") {
      filtered = filtered.filter((t) => t.status === tab);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((t) => {
        const sd = t.structured_data as StructuredTicket | null;
        return (
          sd?.well_name?.toLowerCase().includes(q) ||
          sd?.job_type?.toLowerCase().includes(q) ||
          sd?.operator?.toLowerCase().includes(q) ||
          sd?.location?.toLowerCase().includes(q)
        );
      });
    }

    return filtered;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const filtered = filterTickets(tickets);
  const counts = {
    all: tickets.length,
    draft: tickets.filter((t) => t.status === "draft").length,
    sent: tickets.filter((t) => t.status === "sent").length,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tickets..."
          className="h-11 pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full bg-secondary">
          <TabsTrigger value="all" className="flex-1">
            All ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex-1">
            Drafts ({counts.draft})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex-1">
            Sent ({counts.sent})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Ticket List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium text-foreground">
            {tickets.length === 0 ? "No tickets yet" : "No matches"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {tickets.length === 0
              ? "Tap Record to create your first field ticket"
              : "Try a different search"}
          </p>
          {tickets.length === 0 && (
            <button
              onClick={() => router.push("/record")}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors"
            >
              <Plus className="h-5 w-5" />
              Record Your First Job
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket) => {
            const sd = ticket.structured_data as StructuredTicket | null;
            const status = statusConfig[ticket.status];
            const StatusIcon = status.icon;

            return (
              <Card
                key={ticket.id}
                className="border-border bg-card cursor-pointer hover:bg-secondary/50 transition-colors active:scale-[0.99]"
                onClick={() => router.push(`/review/${ticket.id}`)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground truncate">
                          {sd?.job_type || "Field Ticket"}
                        </p>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${status.color} shrink-0`}
                        >
                          {status.label}
                        </Badge>
                      </div>

                      {sd?.well_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {sd.well_name}
                          {sd.lease_name && ` · ${sd.lease_name}`}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {sd?.job_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {sd.job_date}
                          </span>
                        )}
                        {sd?.hours_worked ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {sd.hours_worked}h
                          </span>
                        ) : null}
                        <span>
                          {formatDistanceToNow(new Date(ticket.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      {ticket.contacts && (
                        <p className="text-xs text-orange-400 mt-1">
                          Sent to {(ticket.contacts as Contact).name}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => router.push("/record")}
        className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-colors z-40"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}
