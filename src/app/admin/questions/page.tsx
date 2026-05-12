import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Upload, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionDeleteButton } from "@/components/admin/QuestionDeleteButton";

export const dynamic = 'force-dynamic';

const DIFF_LABEL: Record<string, string> = { EASY: "Fácil", MEDIUM: "Médio", HARD: "Difícil" };
const DIFF_COLOR: Record<string, string> = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};

export default async function AdminQuestionsPage() {
  const questions = await prisma.adminQuestion.findMany({
    orderBy: [{ adminModule: { ctflChapter: "asc" } }, { orderIndex: "asc" }],
    include: { adminModule: { select: { title: true, ctflChapter: true } } },
  });

  const byModule = questions.reduce<Record<string, typeof questions>>((acc, q) => {
    const key = q.adminModuleId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  const activeCount = questions.filter((q) => q.isActive).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questões</h1>
          <p className="text-sm text-gray-400 mt-0.5">{questions.length} no banco · {activeCount} ativas</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/questions/import"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Importar
          </Link>
          <Link
            href="/admin/questions/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova questão
          </Link>
        </div>
      </div>

      {questions.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <HelpCircle className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nenhuma questão cadastrada</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Adicione questões individualmente ou importe em massa.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/admin/questions/import" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
              <Upload className="w-4 h-4" /> Importar
            </Link>
            <Link href="/admin/questions/new" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
              <Plus className="w-4 h-4" /> Nova questão
            </Link>
          </div>
        </div>
      )}

      {Object.entries(byModule).map(([moduleId, qs]) => {
        const mod = qs[0].adminModule;
        const activeQs = qs.filter((q) => q.isActive).length;
        return (
          <div key={moduleId}>
            {/* Module header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0">
                  {mod.ctflChapter}
                </span>
                <div>
                  <span className="text-sm font-semibold text-gray-800">{mod.title}</span>
                  <span className="ml-2 text-xs text-gray-400">{qs.length} questões · {activeQs} ativas</span>
                </div>
              </div>
              <Link
                href={`/admin/questions/new?moduleId=${moduleId}`}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Link>
            </div>

            {/* Question rows */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {qs.map((q, i) => (
                <div
                  key={q.id}
                  className={cn(
                    "flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group",
                    i !== 0 && "border-t border-gray-50",
                    !q.isActive && "opacity-50"
                  )}
                >
                  <span className="text-xs text-gray-300 font-mono w-5 flex-shrink-0 mt-0.5 text-right">{i + 1}</span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug line-clamp-2">{q.statement}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {q.syllabusRef && (
                        <span className="text-[11px] text-gray-400 font-mono">{q.syllabusRef}</span>
                      )}
                      <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-medium", DIFF_COLOR[q.difficulty] ?? "bg-gray-100 text-gray-600")}>
                        {DIFF_LABEL[q.difficulty] ?? q.difficulty}
                      </span>
                      <span className="text-[11px] text-emerald-600 font-semibold">✓ {q.correctAnswer}</span>
                      {!q.isActive && <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">inativa</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                    <Link
                      href={`/admin/questions/${q.id}?moduleId=${moduleId}`}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </Link>
                    <QuestionDeleteButton questionId={q.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
