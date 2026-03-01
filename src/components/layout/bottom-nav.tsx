"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mic, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Tickets", icon: LayoutDashboard },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");
          const isRecord = href === "/record";

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                isActive && !isRecord && "text-orange-500",
                !isActive && !isRecord && "text-muted-foreground",
                isRecord && "relative -top-3"
              )}
            >
              {isRecord ? (
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors",
                    isActive
                      ? "bg-orange-500 text-white"
                      : "bg-orange-500/80 text-white"
                  )}
                >
                  <Icon className="h-7 w-7" />
                </div>
              ) : (
                <Icon className="h-5 w-5" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  isRecord && "mt-1"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
