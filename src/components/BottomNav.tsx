"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  PlayCircle,
  BookOpen,
  Flame,
} from "lucide-react";

const mobileNavItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/trilha", label: "Trilha", icon: Flame },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/simulation", label: "Simulado", icon: PlayCircle },
  { href: "/study-plan", label: "Plano", icon: BookOpen },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  active ? "text-indigo-600" : "text-gray-400"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active ? "text-indigo-600" : "text-gray-500"
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
