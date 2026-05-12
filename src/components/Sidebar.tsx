"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  FileText,
  PlayCircle,
  History,
  BookOpen,
  LogOut,
  GraduationCap,
  Terminal,
  Flame,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trilha", label: "Trilha de Estudos", icon: Flame },
  { href: "/upload", label: "Upload PDF", icon: Upload },
  { href: "/materials", label: "Materiais", icon: FileText },
  { href: "/simulation", label: "Simulado", icon: PlayCircle },
  { href: "/history", label: "Histórico", icon: History },
  { href: "/study-plan", label: "Plano de Estudos", icon: BookOpen },
  { href: "/logs", label: "Logs do Sistema", icon: Terminal },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-gray-200 fixed top-0 left-0 z-30">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">CTFL Smart Prep</p>
          <p className="text-xs text-gray-500">Certificação ISTQB</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className={cn("w-5 h-5", active ? "text-indigo-600" : "text-gray-400")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-all"
        >
          <LogOut className="w-5 h-5 text-gray-400" />
          Sair
        </button>
      </div>
    </aside>
  );
}
