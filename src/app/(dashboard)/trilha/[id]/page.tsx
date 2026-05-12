"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock, CheckCircle2, Star, Loader2, Flame, ChevronLeft, Trophy, AlertCircle, PlayCircle } from "lucide-react";
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
      .then((data) => {
        setPath(data);
        setLoading(false);
      });
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );

  if (!path)
    return (
      <div className="text-center py-16 text-gray-500">Trilha não encontrada.</div>
    );

  const total = path.modules.length;
  const done = path.modules.filter((m) => m.status === "COMPLETED").length;
  const allDone = done === total && total > 0;
  const priorityCount = path.modules.filter((m) => m.isPriority).length;
  const remaining = total - done;
  const estMins = remaining * 30;
  const estLabel = estMins >= 60 ? `~${Math.round(estMins / 60)}h` : `~${estMins}min`;

  // Split modules into priority and standard sections
  const priorityMods = path.modules.filter((m) => m.isPriority);
  const standardMods = path.modules.filter((m) => !m.isPriority);

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/trilha")}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">{path.title}</h1>
          <p className="text-xs text-gray-500">
            {done}/{total} módulos concluídos
            {!allDone && ` · ${estLabel} restantes`}
            {priorityCount > 0 && ` · ${priorityCount} prioritários`}
          </p>
        </div>
        {allDone && <Trophy className="w-6 h-6 text-yellow-500" />}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progresso geral</span>
          <span>{total > 0 ? Math.round((done / total) * 100) : 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {allDone && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-5 text-center space-y-4">
          <Trophy className="w-10 h-10 text-yellow-500 mx-auto" />
          <div>
            <p className="font-bold text-yellow-800 text-lg">Trilha Concluída!</p>
            <p className="text-sm text-yellow-700 mt-1">
              Você estudou todos os módulos. Agora é hora de provar o seu conhecimento na prova oficial.
            </p>
          </div>
          <button
            onClick={() => router.push("/simulation")}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition text-sm"
          >
            <PlayCircle className="w-5 h-5" />
            Iniciar Simulado Final — 40 questões · 65 min
          </button>
        </div>
      )}

      {/* Priority section */}
      {priorityMods.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-orange-700 uppercase tracking-wide">
              Áreas Prioritárias — foco do seu plano de estudos
            </h2>
          </div>
          <ModuleList modules={priorityMods} pathId={id} />
        </section>
      )}

      {/* Standard section */}
      {standardMods.length > 0 && (
        <section className="space-y-3">
          {priorityMods.length > 0 && (
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Demais capítulos
            </h2>
          )}
          <ModuleList modules={standardMods} pathId={id} />
        </section>
      )}
    </div>
  );
}

function ModuleList({ modules, pathId }: { modules: Module[]; pathId: string }) {
  const router = useRouter();
  return (
    <div className="relative">
      <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gray-200" />
      <div className="space-y-4">
        {modules.map((mod) => {
          const isLocked = mod.status === "LOCKED";
          const isCompleted = mod.status === "COMPLETED";
          const isCurrent = mod.status === "UNLOCKED";
          const numStars = starsCount(mod.bestScore, mod._count.attempts);
          const clickable = !isLocked;

          return (
            <div key={mod.id} className="relative flex items-center gap-4">
              <button
                disabled={!clickable}
                onClick={() => clickable && router.push(`/trilha/${pathId}/modulo/${mod.id}`)}
                className={cn(
                  "relative z-10 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-4",
                  isCompleted && "bg-green-500 border-green-300 shadow-lg shadow-green-200",
                  isCurrent && mod.isPriority
                    ? "bg-orange-500 border-orange-300 shadow-lg shadow-orange-200 animate-pulse"
                    : isCurrent
                    ? "bg-indigo-600 border-indigo-300 shadow-lg shadow-indigo-200 animate-pulse"
                    : "",
                  isLocked && "bg-gray-200 border-gray-100 cursor-not-allowed"
                )}
              >
                {isCompleted && <CheckCircle2 className="w-7 h-7 text-white" />}
                {isCurrent && <Flame className="w-7 h-7 text-white" />}
                {isLocked && <Lock className="w-5 h-5 text-gray-400" />}
              </button>

              <button
                disabled={!clickable}
                onClick={() => clickable && router.push(`/trilha/${pathId}/modulo/${mod.id}`)}
                className={cn(
                  "flex-1 text-left rounded-xl px-4 py-3 transition-all",
                  isCompleted && "bg-green-50 border border-green-200 hover:bg-green-100",
                  isCurrent && mod.isPriority
                    ? "bg-orange-50 border border-orange-300 hover:bg-orange-100"
                    : isCurrent
                    ? "bg-indigo-50 border border-indigo-300 hover:bg-indigo-100"
                    : "",
                  isLocked && "bg-gray-50 border border-gray-200 opacity-60 cursor-not-allowed"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {mod.isPriority && !isCompleted && (
                        <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                          Prioridade
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "font-semibold text-sm truncate",
                      isCompleted && "text-green-800",
                      isCurrent && mod.isPriority ? "text-orange-800" : isCurrent ? "text-indigo-800" : "",
                      isLocked && "text-gray-400"
                    )}>
                      {mod.title}
                    </p>
                    <p className={cn(
                      "text-xs mt-0.5",
                      isCompleted && "text-green-600",
                      isCurrent && mod.isPriority ? "text-orange-600" : isCurrent ? "text-indigo-600" : "",
                      isLocked && "text-gray-400"
                    )}>
                      {isCompleted ? "Concluído" : isCurrent ? "Em andamento" : "Bloqueado"}
                      {mod._count.attempts > 0 &&
                        ` · ${mod._count.attempts} ${mod._count.attempts === 1 ? "tentativa" : "tentativas"}`}
                    </p>
                  </div>
                  {isCompleted && (
                    <div className="flex gap-0.5 flex-shrink-0">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "w-4 h-4",
                            s <= numStars ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
