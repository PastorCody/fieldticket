"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mic, LogOut, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const router = useRouter();
  const supabase = createClient();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (data?.is_admin) setShowAdmin(true);
    }
    checkAdmin();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">
            FieldTicket
          </span>
        </div>
        <div className="flex items-center gap-1">
          {showAdmin && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
            >
              <Link href="/admin">
                <BarChart3 className="h-5 w-5" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
