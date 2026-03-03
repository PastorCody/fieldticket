"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Users,
  FileText,
  Send,
  DollarSign,
  Clock,
  Loader2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { AdminStats, AdminUserRow } from "@/types/ticket";

// ---------- Helpers ----------

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatHours(val: number): string {
  return val % 1 === 0 ? val.toString() : val.toFixed(1);
}

// ---------- Sort Types ----------

type SortKey =
  | "fullName"
  | "ticketCount"
  | "ticketsSent"
  | "totalHours"
  | "totalRevenue"
  | "lastActive"
  | "signedUpAt";
type SortDir = "asc" | "desc";

// ---------- Component ----------

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("ticketCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    async function load() {
      // Quick auth check client-side
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/admin/stats");
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        setError("Failed to load analytics");
        setLoading(false);
        return;
      }

      const data: AdminStats = await res.json();
      setStats(data);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  // Sort users
  const sortedUsers = useMemo(() => {
    if (!stats) return [];
    return [...stats.users].sort((a, b) => {
      let cmp = 0;
      const av = a[sortKey];
      const bv = b[sortKey];

      if (av === null && bv === null) cmp = 0;
      else if (av === null) cmp = -1;
      else if (bv === null) cmp = 1;
      else if (typeof av === "string" && typeof bv === "string")
        cmp = av.localeCompare(bv);
      else if (typeof av === "number" && typeof bv === "number")
        cmp = av - bv;

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [stats, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Chart data formatting
  const chartData = useMemo(() => {
    if (!stats) return [];
    return stats.activity.map((a) => ({
      week: format(new Date(a.week), "MMM d"),
      tickets: a.tickets,
      emails: a.emails,
    }));
  }, [stats]);

  // ---------- Loading State ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{error || "No data available"}</p>
      </div>
    );
  }

  // ---------- Render ----------

  const { overview } = stats;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Platform Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of all FieldTicket usage and activity
        </p>
      </div>

      {/* ── Overview Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={overview.totalUsers.toString()}
        />
        <StatCard
          icon={FileText}
          label="Total Tickets"
          value={overview.totalTickets.toString()}
        />
        <StatCard
          icon={Send}
          label="Emails Sent"
          value={overview.totalEmailsSent.toString()}
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(overview.totalRevenue)}
        />
      </div>

      {/* ── Secondary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Total Hours"
          value={formatHours(overview.totalHours)}
          small
        />
        <StatCard
          icon={Users}
          label="Contacts"
          value={overview.totalContacts.toString()}
          small
        />
        <div className="col-span-2 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant="secondary" className="bg-zinc-700 text-zinc-300">
            Draft {overview.ticketsByStatus.draft}
          </Badge>
          <Badge variant="secondary" className="bg-blue-900 text-blue-300">
            Sent {overview.ticketsByStatus.sent}
          </Badge>
          <Badge variant="secondary" className="bg-green-900 text-green-300">
            Viewed {overview.ticketsByStatus.viewed}
          </Badge>
        </div>
      </div>

      {/* ── Activity Chart ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar
                  dataKey="tickets"
                  name="Tickets"
                  fill="#ff6b35"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="emails"
                  name="Emails"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── User Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <SortHeader
                  label="Name"
                  sortKey="fullName"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <th className="py-3 px-3 text-muted-foreground font-medium hidden md:table-cell">
                  Company
                </th>
                <SortHeader
                  label="Tickets"
                  sortKey="ticketCount"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortHeader
                  label="Sent"
                  sortKey="ticketsSent"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="text-right hidden sm:table-cell"
                />
                <SortHeader
                  label="Hours"
                  sortKey="totalHours"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="text-right hidden sm:table-cell"
                />
                <SortHeader
                  label="Revenue"
                  sortKey="totalRevenue"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortHeader
                  label="Last Active"
                  sortKey="lastActive"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="text-right hidden lg:table-cell"
                />
                <SortHeader
                  label="Signed Up"
                  sortKey="signedUpAt"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="text-right hidden lg:table-cell"
                />
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border/50 hover:bg-card/50 transition-colors"
                >
                  <td className="py-3 px-3">
                    <div>
                      <div className="font-medium text-foreground">
                        {user.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">
                    {user.company || "—"}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-foreground">
                    {user.ticketCount}
                  </td>
                  <td className="py-3 px-3 text-right text-muted-foreground hidden sm:table-cell">
                    {user.ticketsSent}
                  </td>
                  <td className="py-3 px-3 text-right text-muted-foreground hidden sm:table-cell">
                    {formatHours(user.totalHours)}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-foreground">
                    {user.totalRevenue > 0
                      ? formatCurrency(user.totalRevenue)
                      : "—"}
                  </td>
                  <td className="py-3 px-3 text-right text-muted-foreground text-xs hidden lg:table-cell">
                    {user.lastActive
                      ? formatDistanceToNow(new Date(user.lastActive), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </td>
                  <td className="py-3 px-3 text-right text-muted-foreground text-xs hidden lg:table-cell">
                    {format(new Date(user.signedUpAt), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
              {sortedUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No users yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Ticket Analytics ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Job Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-orange-500" />
              Top Job Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topJobTypes.length > 0 ? (
              <div className="space-y-3">
                {stats.topJobTypes.map((jt, i) => {
                  const max = stats.topJobTypes[0].count;
                  const pct = max > 0 ? (jt.count / max) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-foreground">{jt.jobType}</span>
                        <span className="text-muted-foreground">
                          {jt.count}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary">
                        <div
                          className="h-2 rounded-full bg-orange-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No job types recorded yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <QuickStat
                label="Avg Hours / Ticket"
                value={
                  overview.totalTickets > 0
                    ? formatHours(overview.totalHours / overview.totalTickets)
                    : "0"
                }
              />
              <QuickStat
                label="Avg Revenue / Ticket"
                value={
                  overview.totalTickets > 0
                    ? formatCurrency(
                        overview.totalRevenue / overview.totalTickets
                      )
                    : "$0"
                }
              />
              <QuickStat
                label="Tickets / User"
                value={
                  overview.totalUsers > 0
                    ? (overview.totalTickets / overview.totalUsers)
                        .toFixed(1)
                        .replace(/\.0$/, "")
                    : "0"
                }
              />
              <QuickStat
                label="Send Rate"
                value={
                  overview.totalTickets > 0
                    ? `${Math.round(
                        ((overview.ticketsByStatus.sent +
                          overview.ticketsByStatus.viewed) /
                          overview.totalTickets) *
                          100
                      )}%`
                    : "0%"
                }
              />
              <QuickStat
                label="Contacts / User"
                value={
                  overview.totalUsers > 0
                    ? (overview.totalContacts / overview.totalUsers)
                        .toFixed(1)
                        .replace(/\.0$/, "")
                    : "0"
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------- Sub-components ----------

function StatCard({
  icon: Icon,
  label,
  value,
  small,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-orange-500" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div
        className={`font-bold text-foreground ${small ? "text-xl" : "text-2xl"}`}
      >
        {value}
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function SortHeader({
  label,
  sortKey: key,
  currentKey,
  dir,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === key;
  return (
    <th
      className={`py-3 px-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors ${
        active ? "text-foreground" : "text-muted-foreground"
      } ${className}`}
      onClick={() => onSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}
