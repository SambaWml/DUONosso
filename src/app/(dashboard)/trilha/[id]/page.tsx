"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock, CheckCircle2, Star, Loader2, Flame, ChevronLeft, Trophy, AlertCircle, PlayCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  title: string;
  orderIndex: number;
  status: "LOCKED" | "UNLOCKED" | "COMPLETED";
  bestScore: number | null;
  isPriority: boolean;
  _count: { attempts: number };
  attempts: Array<{ score: number; passed: boolean; createdAt: string }>;
}

interface LearningPath {
  id: string;
  title: string;
  material: { filename: string; type: string } | null;
  modules: Module[];
}

function starsCount(score: number | null, attempts: number) {
  if (score === null) return 0;
  if (attempts === 1) return 3;
  if (attempts === 2) return 2;
  return 1;
}

export default function PathPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/learning-paths/${id}`)
      .then((r) => r.json())
      .then((data) => { setPath(data); setLoading(false); });
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );

  if (!path)
    return <div className="text-center py-16 text-gray-500">Trilha não encontrada.</div>;

  const total = path.modules.length;
  const done = path.modules.filter((m) => m.status === "COMPLETED").length;
  const allDone = done === total && total > 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining = total - done;
  const estLabel = remaining > 0 ? (remaining * 30 >= 60 ? `~${Math.round((remaining * 30) / 60)}h restantes` : `~${remaining * 30}min restantes`) : null;

  const priorityMods = path.modules.filter((m) => m.isPriority);
  const standardMods = path.modules.filter((m) => !m.isPriority);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/trilha")} className="p-2 hover:bg-gray-100 rounded-xl transition flex-shrink-0">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{path.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {done}/{total} módulos concluídos
            {estLabel && <span className="text-gray-400"> · {estLabel}</span>}
          </p>
        </div>
        {allDone && <Trophy className="w-7 h-7 text-yellow-500 flex-shrink-0" />}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Progresso geral</span>
          <span className="text-2xl font-bold text-indigo-600">{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />{done} concluídos</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />{path.modules.filter(m => m.status === "UNLOCKED").length} em andamento</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />{path.modules.filter(m => m.status === "LOCKED").length} bloqueados</span>
        </div>
      </div>

      {/* Completed banner */}
      {allDone && (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-8 h-8 text-yellow-300" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">Trilha Concluída!</p>
              <p className="text-sm text-indigo-200 mt-0.5">Você estudou todos os módulos. Hora do simulado oficial.</p>
            </div>
            <button
              onClick={() => router.push("/simulation")}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 rounded-xl font-semibold hover:bg-indigo-50 transition text-sm flex-shrink-0"
            >
              <PlayCircle className="w-4 h-4" /> Simulado Final
            </button>
          </div>
        </div>
      )}

      {/* Priority modules */}
      {priorityMods.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Áreas Prioritárias</h2>
            <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">{priorityMods.length} módulo{priorityMods.length !== 1 ? "s" : ""}</span>
          </div>
          <ModuleGrid modules={priorityMods} pathId={id} router={router} />
        </section>
      )}

      {/* Standard modules */}
      {standardMods.length > 0 && (
        <section className="space-y-3">
          {priorityMods.length > 0 && (
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Demais Capítulos</h2>
          )}
          <ModuleGrid modules={standardMods} pathId={id} router={router} />
        </section>
      )}
    </div>
  );
}

function ModuleGrid({ modules, pathId, router }: { modules: Module[]; pathId: string; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {modules.map((mod) => {
        const isLocked = mod.status === "LOCKED";
        const isCompleted = mod.status === "COMPLETED";
        const isCurrent = mod.status === "UNLOCKED";
        const numStars = starsCount(mod.bestScore, mod._count.attempts);

        return (
          <button
            key={mod.id}
            disabled={isLocked}
            onClick={() => !isLocked && router.push(`/trilha/${pathId}/modulo/${mod.id}`)}
            className={cn(
              "text-left rounded-2xl border-2 p-4 transition-all group",
              isCompleted && "border-green-200 bg-green-50 hover:border-green-300 hover:shadow-md",
              isCurrent && mod.isPriority && "border-orange-300 bg-orange-50 hover:border-orange-400 hover:shadow-md",
              isCurrent && !mod.isPriority && "border-indigo-300 bg-indigo-50 hover:border-indigo-400 hover:shadow-md",
              isLocked && "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              {/* Status icon */}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                isCompleted && "bg-green-500",
                isCurrent && mod.isPriority && "bg-orange-500",
                isCurrent && !mod.isPriority && "bg-indigo-600",
                isLocked && "bg-gray-200"
              )}>
                {isCompleted && <CheckCircle2 className="w-5 h-5 text-white" />}
                {isCurrent && <Flame className="w-5 h-5 text-white" />}
                {isLocked && <Lock className="w-4 h-4 text-gray-400" />}
              </div>

              {/* Stars */}
              {isCompleted && (
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <Star key={s} className={cn("w-4 h-4", s <= numStars ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200")} />
                  ))}
                </div>
              )}

              {/* Priority badge */}
              {mod.isPriority && !isCompleted && (
                <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  Prioridade
                </span>
              )}
            </div>

            <p className={cn(
              "font-semibold text-sm leading-snug mb-1",
              isCompleted && "text-green-800",
              isCurrent && mod.isPriority ? "text-orange-800" : isCurrent ? "text-indigo-800" : "",
              isLocked && "text-gray-400"
            )}>
              {mod.title}
            </p>

            <div className="flex items-center justify-between">
              <p className={cn(
                "text-xs",
                isCompleted && "text-green-600",
                isCurrent && mod.isPriority ? "text-orange-600" : isCurrent ? "text-indigo-600" : "",
                isLocked && "text-gray-400"
              )}>
                {isCompleted ? "Concluído" : isCurrent ? "Em andamento" : "Bloqueado"}
                {mod._count.attempts > 0 && ` · ${mod._count.attempts} ${mod._count.attempts === 1 ? "tentativa" : "tentativas"}`}
              </p>

              {!isLocked && (
                <ChevronRight className={cn(
                  "w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5",
                  isCompleted ? "text-green-400" : "text-indigo-400"
                )} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
