"use client";

import { useState } from "react";
import { Loader2, GitMerge } from "lucide-react";
import { useRouter } from "next/navigation";

export function MergeModulesButton({
  keepId,
  deleteId,
  totalQuestions,
}: {
  keepId: string;
  deleteId: string;
  totalQuestions: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleMerge() {
    if (!confirm(`Mesclar os ${totalQuestions} módulos duplicados em um só? Esta ação não pode ser desfeita.`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/modules/${keepId}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteId }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error ?? "Erro ao mesclar módulos.");
    }
  }

  return (
    <button
      onClick={handleMerge}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-semibold hover:bg-orange-100 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
      Mesclar duplicatas
    </button>
  );
}
