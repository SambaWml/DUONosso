"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  ChevronRight,
  Trophy,
  Target,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn, formatDate, formatDuration, getScoreBadge } from "@/lib/utils";

interface Simulation {
  id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSec: number;
  createdAt: string;
}

export default function HistoryPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/simulations")
      .then((r) => r.json())
      .then((d) => { setSimulations(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const totalSimulations = simulations.length;
  const avgScore = totalSimulations > 0
    ? Math.round(simulations.reduce((s, sim) => s + sim.percentage, 0) / totalSimulations)
    : 0;
  const bestScore = totalSimulations > 0
    ? Math.max(...simulations.map((s) => s.percentage))
    : 0;
  const approved = simulations.filter((s) => s.percentage >= 65).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest mb-0.5">Resultados</p>
        <h1 className="text-2xl font-black text-[#1A1B2E]">Histórico de Simulados</h1>
        <p className="text-xs text-gray-400 font-medium mt-0.5">Acompanhe sua evolução ao longo do tempo.</p>
      </div>

      {/* Summary stats */}
      {totalSimulations > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] p-5">
            <BarChart3 className="w-5 h-5 text-indigo-500 mb-2" />
            <p className="text-2xl font-black text-[#1A1B2E]">{totalSimulations}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-0.5">Total</p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] p-5">
            <Target className="w-5 h-5 text-green-500 mb-2" />
            <p className="text-2xl font-black text-[#1A1B2E]">{avgScore}%</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-0.5">Média geral</p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] p-5">
            <Trophy className="w-5 h-5 text-yellow-500 mb-2" />
            <p className="text-2xl font-black text-[#1A1B2E]">{Math.round(bestScore)}%</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-0.5">Melhor score</p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] p-5">
            <Clock className="w-5 h-5 text-indigo-500 mb-2" />
            <p className="text-2xl font-black text-[#1A1B2E]">{approved}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-0.5">Aprovações (≥65%)</p>
          </div>
        </div>
      )}

      {simulations.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900 mb-1">Nenhum simulado realizado</p>
          <p className="text-gray-500 text-sm mb-6">Complete seu primeiro simulado para ver o histórico.</p>
          <Link
            href="/simulation"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-extrabold text-xs uppercase tracking-wide hover:brightness-105 transition shadow-[0_3px_0_#3E2EA0] active:translate-y-0.5 active:shadow-none"
          >
            Iniciar Simulado
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] overflow-hidden">
          <div className="divide-y divide-gray-100">
            {(() => {
              const bestIdx = simulations.reduce(
                (best, sim, i) => sim.percentage > simulations[best].percentage ? i : best,
                0
              );
              return simulations.map((sim, i) => {
              const badge = getScoreBadge(sim.percentage);
              const isBest = i === bestIdx;

              return (
                <Link
                  key={sim.id}
                  href={`/results/${sim.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition"
                >
                  {/* Index */}
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0",
                    isBest ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
                  )}>
                    {isBest ? <Trophy className="w-4 h-4" /> : `#${totalSimulations - i}`}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm">
                        {sim.score}/{sim.totalQuestions} acertos
                      </p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badge.color)}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">{formatDate(sim.createdAt)}</span>
                      {sim.timeSpentSec > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(sim.timeSpentSec)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn(
                      "text-lg font-bold",
                      sim.percentage >= 65 ? "text-green-600" : sim.percentage >= 45 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {Math.round(sim.percentage)}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </Link>
              );
            });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
