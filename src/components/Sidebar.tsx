"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlayCircle,
  History,
  BookOpen,
  LogOut,
  Flame,
  ShieldCheck,
  Terminal,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trilha", label: "Trilha", icon: Flame },
  { href: "/simulation", label: "Simulado", icon: PlayCircle },
  { href: "/history", label: "Histórico", icon: History },
  { href: "/study-plan", label: "Plano de Estudos", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r-2 border-[#E9E4F2] fixed top-0 left-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b-2 border-[#E9E4F2]">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-[0_3px_0_#3E2EA0]">
          <span className="text-white font-black text-base leading-none">Q</span>
        </div>
        <div className="min-w-0">
          <p className="font-black text-gray-900 text-sm leading-tight truncate">QVenture</p>
          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5">Certificação ISTQB</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest px-2 mb-2">Menu</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all border-2",
                active
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-700 border-transparent"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-indigo-500" : "text-gray-400")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t-2 border-[#E9E4F2] space-y-0.5">
        {isAdmin && (
          <>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all border-2",
                pathname.startsWith("/admin")
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-700 border-transparent"
              )}
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-gray-400" />
              Painel Admin
            </Link>
            <Link
              href="/logs"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all border-2",
                pathname === "/logs"
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-700 border-transparent"
              )}
            >
              <Terminal className="w-4 h-4 flex-shrink-0 text-gray-400" />
              Logs
            </Link>
          </>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide text-gray-400 hover:bg-red-50 hover:text-red-500 w-full transition-all border-2 border-transparent"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
