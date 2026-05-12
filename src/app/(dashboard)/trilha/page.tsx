"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Flame, PlayCircle, BookOpen, ChevronRight, Trophy, GraduationCap, RefreshCw } from "lucide-react";

interface LearningPath {
  id: string;
  title: string;
  modules: Array<{ id: string; status: string; title: string }>;
  createdAt: string;
}

interface StepState {
  hasMaterial: boolean;
  hasSimulation: boolean;
}

export default function TrilhaPage() {
  const router = useRouter();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [steps, setSteps] = useState<StepState>({ hasMaterial: false, hasSimulation: false });
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    async function init() {
      const [rawPaths, simulations] = await Promise.all([
        fetch("/api/learning-paths").then((r) => r.json()),
        fetch("/api/simulations").then((r) => r.json()),
      ]);

      const pathList: LearningPath[] = Array.isArray(rawPaths) ? rawPaths : [];

      const needsRebuild =
        pathList.length > 1 ||
        (pathList.length === 1 && pathList[0].title !== "Trilha CTFL");

      if (needsRebuild) {
        try {
          const res = await fetch("/api/learning-paths/rebuild", { method: "POST" });
          if (res.ok) {
            const refreshed = await fetch("/api/learning-paths").then((r) => r.json());
            setPaths(Array.isArray(refreshed) ? refreshed : []);
          } else {
            setPaths(pathList);
          }
        } catch {
          setPaths(pathList);
        }
      } else {
        setPaths(pathList);
      }

      setSteps({
        hasMaterial: true, // admin always provides content
        hasSimulation: Array.isArray(simulations) && simulations.length > 0,
      });
      setLoading(false);
    }

    init();
  }, []);

  async function handleRebuild() {
    setRebuilding(true);
    try {
      // Rename any "Seção N" chapters first, then rebuild the track
      await fetch("/api/materials/rename-sections", { method: "POST" });
      await fetch("/api/learning-paths/rebuild", { method: "POST" });
      const refreshed = await fetch("/api/learning-paths").then((r) => r.json());
      setPaths(Array.isArray(refreshed) ? refreshed : []);
    } finally {
      setRebuilding(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );

  const track = paths.find((p) => p.title === "Trilha CTFL") ?? paths[0] ?? null;
  const trackAllDone = track ? track.modules.length > 0 && track.modules.every((m) => m.status === "COMPLETED") : false;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
          <Flame className="w-6 h-6 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Trilha de Estudos CTFL</h1>
          <p className="text-sm text-gray-500">
            Módulos ordenados pelo seu plano de estudos — 70% para avançar
          </p>
        </div>
        <button
          onClick={handleRebuild}
          disabled={rebuilding}
          title="Atualizar trilha com base no plano de estudos atual"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition flex-shrink-0"
        >
          <RefreshCw className={rebuilding ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
          {rebuilding ? "Atualizando..." : "Atualizar trilha"}
        </button>
      </div>

      {/* Active unified track */}
      {track && (
        <div className="space-y-3">
          {(() => {
            const total = track.modules.length;
            const done = track.modules.filter((m) => m.status === "COMPLETED").length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <>
                <button
                  onClick={() => router.push(`/trilha/${track.id}`)}
                  className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                          Plano de Estudos
                        </span>
                        {trackAllDone && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Concluída
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900">Trilha CTFL</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {done}/{total} módulos completos
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-indigo-600">{pct}%</p>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>

                {trackAllDone && (
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white text-center space-y-3 shadow-lg">
                    <GraduationCap className="w-10 h-10 mx-auto opacity-90" />
                    <div>
                      <p className="font-bold text-lg">Trilha concluída!</p>
                      <p className="text-sm text-indigo-200 mt-1">
                        Você estudou todos os capítulos. Agora faça o simulado oficial com timer real.
                      </p>
                    </div>
                    <button
                      onClick={() => router.push("/simulation")}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white text-indigo-700 rounded-xl font-semibold hover:bg-indigo-50 transition text-sm"
                    >
                      <PlayCircle className="w-5 h-5" />
                      Iniciar Simulado Final — 40 questões · 65 min
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Setup flow — only shown when no track exists */}
      {!track && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Como funciona</h2>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
            <StepRow
              number={1}
              done={steps.hasSimulation}
              active={!steps.hasSimulation}
              icon={<PlayCircle className="w-4 h-4" />}
              title="Realize o simulado diagnóstico"
              description="40 questões do banco oficial CTFL — a IA analisa seus erros e monta sua trilha personalizada"
              cta="Ir para simulado"
              onClick={() => router.push("/simulation")}
            />
            <StepRow
              number={2}
              done={false}
              active={steps.hasSimulation}
              icon={<BookOpen className="w-4 h-4" />}
              title="Siga sua trilha personalizada"
              description="Estude cada módulo pelo resumo e responda os quizzes para avançar"
              cta=""
              onClick={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StepRow({
  number, done, active, icon, title, description, cta, onClick,
}: {
  number: number; done: boolean; active: boolean; icon: React.ReactNode;
  title: string; description: string; cta: string; onClick: () => void;
}) {
  return (
    <div className={`flex items-center gap-4 px-5 py-4 ${active ? "bg-indigo-50" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold
        ${done ? "bg-green-500 text-white" : active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"}`}>
        {done ? "✓" : number}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${done ? "text-gray-400 line-through" : active ? "text-gray-900" : "text-gray-400"}`}>
          {title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      {active && (
        <button
          onClick={onClick}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition flex-shrink-0"
        >
          {cta} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
