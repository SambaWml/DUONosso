"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  History,
  PlayCircle,
  BookOpen,
  Flame,
  ShieldCheck,
} from "lucide-react";

const baseNavItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/trilha", label: "Trilha", icon: Flame },
  { href: "/simulation", label: "Simulado", icon: PlayCircle },
  { href: "/history", label: "Histórico", icon: History },
  { href: "/study-plan", label: "Plano", icon: BookOpen },
];

const adminNavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const navItems = isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-[#E9E4F2]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const isAdminItem = href === "/admin";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all min-h-[44px] justify-center min-w-0",
                isAdminItem && active
                  ? "bg-indigo-600"
                  : active
                  ? "bg-indigo-50"
                  : ""
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isAdminItem
                    ? active ? "text-white" : "text-indigo-500"
                    : active ? "text-indigo-600" : "text-gray-400"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-extrabold leading-tight uppercase tracking-wide",
                  isAdminItem
                    ? active ? "text-white" : "text-indigo-500"
                    : active ? "text-indigo-600" : "text-gray-400"
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
