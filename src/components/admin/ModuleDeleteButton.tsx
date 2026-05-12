"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function ModuleDeleteButton({
  moduleId,
  title,
  redirectTo,
}: {
  moduleId: string;
  title: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Excluir o módulo "${title}" e todas as suas questões?\n\nEsta ação não pode ser desfeita.`)) return;
    setLoading(true);
    await fetch(`/api/admin/modules/${moduleId}`, { method: "DELETE" });
    setLoading(false);
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
      title="Excluir módulo"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}
