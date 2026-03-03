import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { startOfWeek, format, subWeeks } from "date-fns";
import type {
  StructuredTicket,
  PricingData,
  AdminStats,
  AdminUserRow,
} from "@/types/ticket";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET() {
  try {
    // 1. Auth check
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Admin check
    const supabase = await createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Fetch all data in parallel (service client bypasses RLS)
    const [profilesRes, ticketsRes, emailsRes, contactsRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, company_name, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("tickets")
          .select(
            "id, user_id, status, structured_data, pricing_data, created_at, sent_at"
          )
          .order("created_at", { ascending: false }),
        supabase.from("email_log").select("id, ticket_id, status, sent_at"),
        supabase.from("contacts").select("id, user_id"),
      ]);

    const profiles = profilesRes.data || [];
    const tickets = ticketsRes.data || [];
    const emails = emailsRes.data || [];
    const contacts = contactsRes.data || [];

    // 4. Aggregate: tickets by user
    const ticketsByUser = new Map<string, typeof tickets>();
    for (const ticket of tickets) {
      const arr = ticketsByUser.get(ticket.user_id) || [];
      arr.push(ticket);
      ticketsByUser.set(ticket.user_id, arr);
    }

    // 5. Aggregate: contacts by user
    const contactsByUser = new Map<string, number>();
    for (const contact of contacts) {
      contactsByUser.set(
        contact.user_id,
        (contactsByUser.get(contact.user_id) || 0) + 1
      );
    }

    // 6. Aggregate: emails by ticket_id (to map to user)
    const emailsByTicket = new Map<string, number>();
    for (const email of emails) {
      emailsByTicket.set(
        email.ticket_id,
        (emailsByTicket.get(email.ticket_id) || 0) + 1
      );
    }

    // 7. Status counts
    const ticketsByStatus = { draft: 0, sent: 0, viewed: 0 };
    let totalRevenue = 0;
    let totalHours = 0;

    for (const ticket of tickets) {
      const status = ticket.status as keyof typeof ticketsByStatus;
      if (status in ticketsByStatus) ticketsByStatus[status]++;

      const sd = ticket.structured_data as StructuredTicket | null;
      totalHours += sd?.hours_worked || 0;

      const pd = ticket.pricing_data as PricingData | null;
      totalRevenue += pd?.total || 0;
    }

    // 8. Per-user rows
    const users: AdminUserRow[] = profiles.map((p) => {
      const userTickets = ticketsByUser.get(p.id) || [];
      let userHours = 0;
      let userRevenue = 0;
      let userEmailsSent = 0;
      let lastActive: string | null = null;

      for (const t of userTickets) {
        const sd = t.structured_data as StructuredTicket | null;
        userHours += sd?.hours_worked || 0;

        const pd = t.pricing_data as PricingData | null;
        userRevenue += pd?.total || 0;

        userEmailsSent += emailsByTicket.get(t.id) || 0;

        // Track most recent activity
        const date = t.sent_at || t.created_at;
        if (!lastActive || date > lastActive) lastActive = date;
      }

      return {
        id: p.id,
        fullName: p.full_name || "Unknown",
        email: p.email,
        company: p.company_name,
        signedUpAt: p.created_at,
        ticketCount: userTickets.length,
        ticketsSent: userTickets.filter((t) => t.status !== "draft").length,
        contactCount: contactsByUser.get(p.id) || 0,
        totalHours: Math.round(userHours * 10) / 10,
        totalRevenue: Math.round(userRevenue * 100) / 100,
        lastActive,
      };
    });

    // 9. Weekly activity (last 12 weeks)
    const now = new Date();
    const twelveWeeksAgo = subWeeks(now, 12);
    const weeklyMap = new Map<
      string,
      { tickets: number; emails: number }
    >();

    // Initialize all 12 weeks
    for (let i = 0; i < 12; i++) {
      const weekStart = startOfWeek(subWeeks(now, 11 - i), {
        weekStartsOn: 1,
      });
      const key = format(weekStart, "yyyy-MM-dd");
      weeklyMap.set(key, { tickets: 0, emails: 0 });
    }

    for (const ticket of tickets) {
      const created = new Date(ticket.created_at);
      if (created < twelveWeeksAgo) continue;
      const weekStart = startOfWeek(created, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      const entry = weeklyMap.get(key);
      if (entry) entry.tickets++;
    }

    for (const email of emails) {
      const sent = new Date(email.sent_at);
      if (sent < twelveWeeksAgo) continue;
      const weekStart = startOfWeek(sent, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      const entry = weeklyMap.get(key);
      if (entry) entry.emails++;
    }

    const activity = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({ week, ...data }));

    // 10. Top job types
    const jobTypeCounts = new Map<string, number>();
    for (const ticket of tickets) {
      const sd = ticket.structured_data as StructuredTicket | null;
      const jt = sd?.job_type || "Unknown";
      if (jt && jt !== "Unknown") {
        jobTypeCounts.set(jt, (jobTypeCounts.get(jt) || 0) + 1);
      }
    }

    const topJobTypes = Array.from(jobTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([jobType, count]) => ({ jobType, count }));

    // 11. Build response
    const stats: AdminStats = {
      overview: {
        totalUsers: profiles.length,
        totalTickets: tickets.length,
        totalEmailsSent: emails.length,
        totalContacts: contacts.length,
        ticketsByStatus,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalHours: Math.round(totalHours * 10) / 10,
      },
      users,
      activity,
      topJobTypes,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load stats" },
      { status: 500 }
    );
  }
}
