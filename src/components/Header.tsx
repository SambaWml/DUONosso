"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User, GraduationCap } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">CTFL Smart Prep</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
      {session?.user?.name && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500">Olá, <span className="font-medium text-gray-700">{session.user.name}</span></p>
        </div>
      )}
    </header>
  );
}
