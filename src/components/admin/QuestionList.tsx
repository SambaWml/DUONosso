"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ImageIcon, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  statement: string;
  correctAnswer: string;
  difficulty: string;
  syllabusRef: string | null;
  imageUrl: string | null;
  orderIndex: number;
  isActive: boolean;
}

const DIFF_LABEL: Record<string, string> = { EASY: "Fácil", MEDIUM: "Médio", HARD: "Difícil" };
const DIFF_COLOR: Record<string, string> = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};

export function QuestionList({ questions, moduleId }: { questions: Question[]; moduleId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta questão? Esta ação não pode ser desfeita.")) return;
    setDeleting(id);
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <HelpCircle className="w-10 h-10 text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">Nenhuma questão neste módulo ainda.</p>
        <p className="text-xs text-gray-300 mt-0.5">Use o botão "Adicionar questão" acima.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
      {questions.map((q, i) => (
        <div
          key={q.id}
          className={cn(
            "flex items-start gap-3 p-3.5 rounded-xl border transition-colors",
            q.isActive ? "border-gray-100 bg-gray-50/50 hover:border-indigo-100 hover:bg-indigo-50/30" : "border-gray-100 bg-gray-50/50 opacity-50"
          )}
        >
          <span className="text-xs text-gray-300 font-mono w-5 flex-shrink-0 mt-0.5 text-right">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 line-clamp-2 leading-snug">{q.statement}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", DIFF_COLOR[q.difficulty] ?? "bg-gray-100 text-gray-600")}>
                {DIFF_LABEL[q.difficulty] ?? q.difficulty}
              </span>
              {q.syllabusRef && (
                <span className="text-xs text-gray-400 font-mono">{q.syllabusRef}</span>
              )}
              {q.imageUrl && <ImageIcon className="w-3.5 h-3.5 text-gray-400" />}
              <span className="text-xs text-emerald-600 font-semibold">✓ {q.correctAnswer}</span>
              {!q.isActive && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">inativa</span>}
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Link
              href={`/admin/questions/${q.id}?moduleId=${moduleId}`}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => handleDelete(q.id)}
              disabled={deleting === q.id}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
