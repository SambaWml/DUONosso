"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UserRoleToggle({ userId, currentRole }: { userId: string; currentRole: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isAdmin = currentRole === "ADMIN";

  async function toggle() {
    setLoading(true);
    await fetch(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: isAdmin ? "USER" : "ADMIN" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 ${
        isAdmin
          ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {isAdmin ? "ADMIN" : "USER"}
    </button>
  );
}
