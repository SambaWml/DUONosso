"use client";

import { useState } from "react";

export function ModuleToggle({ moduleId, initialActive }: { moduleId: string; initialActive: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/admin/modules/${moduleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !active }),
    });
    if (res.ok) setActive((v) => !v);
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={active ? "Desativar módulo" : "Ativar módulo"}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        active ? "bg-emerald-500" : "bg-gray-200"
      }`}
    >
      <span
        style={{ transform: active ? "translateX(18px)" : "translateX(2px)" }}
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
      />
    </button>
  );
}
