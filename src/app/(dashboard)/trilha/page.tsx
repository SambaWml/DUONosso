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
        <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0 shadow-[0_3px_0_#fed7aa]">
          <Flame className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest mb-0.5">Aprendizado</p>
          <h1 className="text-2xl font-black text-[#1A1B2E]">Trilha de Estudos CTFL</h1>
        </div>
        <button
          onClick={handleRebuild}
          disabled={rebuilding}
          title="Atualizar trilha com base no plano de estudos atual"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-gray-500 border-2 border-[#E9E4F2] rounded-xl hover:bg-gray-50 disabled:opacity-50 transition flex-shrink-0 whitespace-nowrap uppercase tracking-wide"
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
                  className="w-full text-left bg-white border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] rounded-2xl p-5 hover:border-indigo-200 hover:shadow-[0_3px_0_#D5C5FF] transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-wide">
                          Plano de Estudos
                        </span>
                        {trackAllDone && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-green-50 text-green-600 flex items-center gap-1 uppercase tracking-wide">
                            <Trophy className="w-3 h-3" /> Concluída
                          </span>
                        )}
                      </div>
                      <p className="font-extrabold text-[#1A1B2E]">Trilha CTFL</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">
                        {done}/{total} módulos completos
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-black text-indigo-600">{pct}%</p>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-[#EBE3FF] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>

                {trackAllDone && (
                  <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-6 text-white text-center space-y-3 shadow-lg">
                    <GraduationCap className="w-10 h-10 mx-auto opacity-90" />
                    <div>
                      <p className="font-bold text-lg">Trilha concluída!</p>
                      <p className="text-sm text-indigo-200 mt-1">
                        Você estudou todos os capítulos. Agora faça o simulado oficial com timer real.
                      </p>
                    </div>
                    <button
                      onClick={() => router.push("/simulation")}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white text-indigo-700 rounded-xl font-extrabold hover:bg-indigo-50 transition text-sm uppercase tracking-wide shadow-[0_3px_0_rgba(0,0,0,0.15)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.15)]"
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
          <h2 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Como funciona</h2>
          <div className="bg-white border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] rounded-2xl overflow-hidden divide-y-2 divide-[#E9E4F2]">
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
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-extrabold
        ${done ? "bg-green-500 text-white" : active ? "bg-indigo-600 text-white shadow-[0_2px_0_#3E2EA0]" : "bg-gray-100 text-gray-400"}`}>
        {done ? "✓" : number}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-extrabold ${done ? "text-gray-400 line-through" : active ? "text-[#1A1B2E]" : "text-gray-400"}`}>
          {title}
        </p>
        <p className="text-xs text-gray-400 font-medium mt-0.5">{description}</p>
      </div>
      {active && (
        <button
          onClick={onClick}
          className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-xs font-extrabold uppercase tracking-wide rounded-xl hover:brightness-105 transition flex-shrink-0 shadow-[0_2px_0_#3E2EA0] active:translate-y-0.5 active:shadow-none"
        >
          {cta} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
