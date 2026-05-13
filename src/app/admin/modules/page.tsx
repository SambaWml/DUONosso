import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Pencil, BookOpen, HelpCircle, AlertTriangle } from "lucide-react";
import { ModuleToggle } from "@/components/admin/ModuleToggle";
import { ModuleDeleteButton } from "@/components/admin/ModuleDeleteButton";
import { MergeModulesButton } from "@/components/admin/MergeModulesButton";

export const dynamic = 'force-dynamic';

export default async function AdminModulesPage() {
  const modules = await prisma.adminModule.findMany({
    orderBy: [{ ctflChapter: "asc" }, { orderIndex: "asc" }],
    include: { _count: { select: { questions: true } } },
  });

  const chapters = Array.from(new Set(modules.map((m) => m.ctflChapter))).sort();
  const totalQuestions = modules.reduce((s, m) => s + m._count.questions, 0);

  // Count groups with duplicates for the banner
  let dupGroupCount = 0;
  for (const ch of chapters) {
    const chMods = modules.filter((m) => m.ctflChapter === ch);
    const byTitle = new Map<string, typeof modules>();
    for (const mod of chMods) {
      const key = mod.title.trim().toLowerCase();
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key)!.push(mod);
    }
    for (const group of byTitle.values()) {
      if (group.length > 1) dupGroupCount++;
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1A1B2E]">Módulos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{modules.length} módulos · {totalQuestions} questões</p>
        </div>
        <Link
          href="/admin/modules/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-extrabold uppercase tracking-wide hover:brightness-105 transition shadow-[0_3px_0_#3E2EA0] active:translate-y-0.5 active:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Novo módulo
        </Link>
      </div>

      {/* Duplicate warning banner */}
      {dupGroupCount > 0 && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">
              {dupGroupCount} grupo{dupGroupCount > 1 ? "s" : ""} com módulos duplicados
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Módulos com o mesmo nome foram encontrados. Use o botão "Mesclar duplicatas" para uni-los em um só.
            </p>
          </div>
        </div>
      )}

      {modules.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nenhum módulo cadastrado</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Crie o primeiro módulo para começar a adicionar questões.</p>
          <Link href="/admin/modules/new" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-extrabold uppercase tracking-wide hover:brightness-105 transition shadow-[0_3px_0_#3E2EA0] active:translate-y-0.5 active:shadow-none">
            <Plus className="w-4 h-4" /> Criar módulo
          </Link>
        </div>
      )}

      {chapters.map((ch) => {
        const chModules = modules.filter((m) => m.ctflChapter === ch);
        const chTotal = chModules.reduce((s, m) => s + m._count.questions, 0);

        // Group by normalized title to detect duplicates
        const byTitle = new Map<string, typeof chModules>();
        for (const mod of chModules) {
          const key = mod.title.trim().toLowerCase();
          if (!byTitle.has(key)) byTitle.set(key, []);
          byTitle.get(key)!.push(mod);
        }

        // Unique groups in original order (first occurrence order)
        const seen = new Set<string>();
        const groups: Array<typeof chModules> = [];
        for (const mod of chModules) {
          const key = mod.title.trim().toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            groups.push(byTitle.get(key)!);
          }
        }

        return (
          <div key={ch}>
            {/* Chapter header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
                {ch}
              </span>
              <div>
                <span className="text-sm font-semibold text-gray-800">Capítulo {ch}</span>
                <span className="ml-2 text-xs text-gray-400">{groups.length} módulo{groups.length !== 1 ? "s" : ""} · {chTotal} questões</span>
              </div>
            </div>

            {/* Module rows */}
            <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] overflow-hidden">
              {groups.map((group, i) => {
                const primary = group[0];
                const isDuplicate = group.length > 1;
                const combinedCount = group.reduce((s, m) => s + m._count.questions, 0);

                // Pick the module with the most questions as the "keep" target
                const keepMod = [...group].sort((a, b) => b._count.questions - a._count.questions)[0];
                const deleteMods = group.filter((m) => m.id !== keepMod.id);

                return (
                  <div
                    key={primary.id}
                    className={`px-5 py-3.5 hover:bg-gray-50/60 transition-colors group ${i !== 0 ? "border-t border-gray-50" : ""} ${isDuplicate ? "bg-orange-50/40 hover:bg-orange-50/60" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <ModuleToggle moduleId={primary.id} initialActive={primary.isActive} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                            {primary.title}
                            {!primary.isActive && <span className="ml-2 text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">inativo</span>}
                          </p>
                          {isDuplicate && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full flex-shrink-0">
                              <AlertTriangle className="w-3 h-3" />
                              {group.length} duplicatas
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <HelpCircle className="w-3 h-3" />
                          {isDuplicate ? (
                            <>{combinedCount} questões no total ({group.map((m) => m._count.questions).join(" + ")})</>
                          ) : (
                            <>{primary._count.questions} questões</>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isDuplicate && (
                          <MergeModulesButton
                            keepId={keepMod.id}
                            deleteId={deleteMods[0].id}
                            totalQuestions={combinedCount}
                          />
                        )}
                        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/admin/modules/${primary.id}`}
                            className="flex items-center gap-1 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <ModuleDeleteButton moduleId={primary.id} title={primary.title} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
