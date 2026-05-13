"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="lg:hidden sticky top-0 z-20 bg-white border-b-2 border-[#E9E4F2]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-[0_2px_0_#3E2EA0]">
            <span className="text-white font-black text-sm leading-none">Q</span>
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm leading-tight">QVenture</p>
            <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider leading-none">Certificação ISTQB</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-50 transition"
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
