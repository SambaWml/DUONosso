"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BookOpen, HelpCircle, Users, LogOut, ShieldCheck, ArrowLeft, Upload, Settings2 } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/modules", label: "Módulos", icon: BookOpen },
  { href: "/admin/questions", label: "Questões", icon: HelpCircle },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/settings", label: "Configurações", icon: Settings2 },
];

const toolItems = [
  { href: "/admin/questions/import", label: "Importar Questões", icon: Upload },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-[#0f1117] fixed top-0 left-0 z-30 border-r border-white/5">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm leading-tight truncate">CTFL Smart Prep</p>
            <p className="text-[10px] text-indigo-400 font-medium tracking-wide uppercase mt-0.5">Painel Admin</p>
          </div>
        </div>

        {/* Main nav */}
        <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-2 mb-2">Menu</p>
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
                  active
                    ? "bg-indigo-600/15 text-indigo-300"
                    : "text-gray-500 hover:bg-white/5 hover:text-gray-200"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />
                )}
                <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-indigo-400" : "text-gray-600 group-hover:text-gray-300")} />
                {label}
              </Link>
            );
          })}

          <div className="pt-4">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-2 mb-2">Ferramentas</p>
            {toolItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
                    active
                      ? "bg-indigo-600/15 text-indigo-300"
                      : "text-gray-500 hover:bg-white/5 hover:text-gray-200"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />
                  )}
                  <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-indigo-400" : "text-gray-600 group-hover:text-gray-300")} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/6 space-y-0.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-white/5 hover:text-gray-200 w-full transition-all"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0 text-gray-600" />
            Voltar ao App
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-500/10 hover:text-red-400 w-full transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 text-gray-600" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0f1117] border-t border-white/8 flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                active ? "text-indigo-400" : "text-gray-600"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
