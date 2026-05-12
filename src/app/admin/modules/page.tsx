import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Pencil, BookOpen, HelpCircle } from "lucide-react";
import { ModuleToggle } from "@/components/admin/ModuleToggle";
import { ModuleDeleteButton } from "@/components/admin/ModuleDeleteButton";

export const dynamic = 'force-dynamic';

export default async function AdminModulesPage() {
  const modules = await prisma.adminModule.findMany({
    orderBy: [{ ctflChapter: "asc" }, { orderIndex: "asc" }],
    include: { _count: { select: { questions: true } } },
  });

  const chapters = Array.from(new Set(modules.map((m) => m.ctflChapter))).sort();
  const totalQuestions = modules.reduce((s, m) => s + m._count.questions, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{modules.length} módulos · {totalQuestions} questões</p>
        </div>
        <Link
          href="/admin/modules/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo módulo
        </Link>
      </div>

      {modules.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nenhum módulo cadastrado</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Crie o primeiro módulo para começar a adicionar questões.</p>
          <Link href="/admin/modules/new" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
            <Plus className="w-4 h-4" /> Criar módulo
          </Link>
        </div>
      )}

      {chapters.map((ch) => {
        const chModules = modules.filter((m) => m.ctflChapter === ch);
        const chTotal = chModules.reduce((s, m) => s + m._count.questions, 0);
        return (
          <div key={ch}>
            {/* Chapter header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
                {ch}
              </span>
              <div>
                <span className="text-sm font-semibold text-gray-800">Capítulo {ch}</span>
                <span className="ml-2 text-xs text-gray-400">{chModules.length} módulo{chModules.length !== 1 ? "s" : ""} · {chTotal} questões</span>
              </div>
            </div>

            {/* Module rows */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {chModules.map((mod, i) => (
                <div
                  key={mod.id}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group ${i !== 0 ? "border-t border-gray-50" : ""}`}
                >
                  <ModuleToggle moduleId={mod.id} initialActive={mod.isActive} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                      {mod.title}
                      {!mod.isActive && <span className="ml-2 text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">inativo</span>}
                    </p>
                    <span className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <HelpCircle className="w-3 h-3" />
                      {mod._count.questions} questões
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/admin/modules/${mod.id}`}
                      className="flex items-center gap-1 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <ModuleDeleteButton moduleId={mod.id} title={mod.title} />
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
