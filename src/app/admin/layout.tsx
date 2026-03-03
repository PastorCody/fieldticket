import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";
import { ArrowLeft, Mic, Shield } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin: admin } = await isAdmin();
  if (!admin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between h-14 px-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to App</span>
            </Link>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
                <Mic className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">
                FieldTicket
              </span>
              <span className="flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-500">
                <Shield className="h-3 w-3" />
                Admin
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
