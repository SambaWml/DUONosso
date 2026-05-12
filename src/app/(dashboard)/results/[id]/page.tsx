"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Target,
  Clock,
  BookOpen,
  PlayCircle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn, formatDuration, getScoreBadge } from "@/lib/utils";

interface SimulationData {
  id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSec: number;
  createdAt: string;
  answers: {
    id: string;
    selectedAnswer: string;
    isCorrect: boolean;
    question: {
      id: string;
      statement: string;
      alternativeA: string;
      alternativeB: string;
      alternativeC: string;
      alternativeD: string;
      correctAnswer: string;
      explanation: string;
      explanationA: string;
      explanationB: string;
      explanationC: string;
      explanationD: string;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      syllabusRef: string | null;
      chapterId: string;
      chapter: { id: string; title: string };
    };
  }[];
}

const DIFFICULTY_LABEL = { EASY: "Fácil", MEDIUM: "Médio", HARD: "Difícil" };
const DIFFICULTY_COLOR = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<SimulationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "correct" | "wrong">("all");
  const [prevPct, setPrevPct] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/simulations?id=${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!data) return;
    fetch("/api/simulations")
      .then((r) => r.json())
      .then((list: { id: string; percentage: number; createdAt: string }[]) => {
        if (!Array.isArray(list)) return;
        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const idx = sorted.findIndex((s) => s.id === data.id);
        if (idx !== -1 && idx < sorted.length - 1) {
          setPrevPct(sorted[idx + 1].percentage);
        }
      })
      .catch(() => {});
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">Simulado não encontrado.</p>;

  const badge = getScoreBadge(data.percentage);
  const approved = data.percentage >= 65; // CTFL oficial: 26/40 = 65%

  const filteredAnswers = data.answers.filter((a) => {
    if (filter === "correct") return a.isCorrect;
    if (filter === "wrong") return !a.isCorrect;
    return true;
  });

  // Chapter performance
  const chapterMap: Record<string, { title: string; correct: number; total: number }> = {};
  for (const a of data.answers) {
    const cid = a.question.chapter.id;
    if (!chapterMap[cid]) chapterMap[cid] = { title: a.question.chapter.title, correct: 0, total: 0 };
    chapterMap[cid].total++;
    if (a.isCorrect) chapterMap[cid].correct++;
  }
  const chapterPerformance = Object.entries(chapterMap)
    .map(([id, v]) => ({ id, ...v, pct: Math.round((v.correct / v.total) * 100) }))
    .sort((a, b) => a.pct - b.pct);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Result header */}
      <div className={cn(
        "rounded-2xl p-8 text-center",
        approved ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200" : "bg-gradient-to-br from-red-50 to-orange-50 border border-red-200"
      )}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: approved ? "#d1fae5" : "#fee2e2" }}>
          {approved ? (
            <Trophy className="w-10 h-10 text-green-600" />
          ) : (
            <Target className="w-10 h-10 text-red-500" />
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          {Math.round(data.percentage)}%
        </h1>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className={cn("text-sm px-3 py-1 rounded-full font-semibold", badge.color)}>
            {badge.label}
          </span>
          {prevPct !== null && (() => {
            const delta = Math.round(data.percentage) - Math.round(prevPct);
            if (delta > 0) return (
              <span className="flex items-center gap-1 text-sm px-3 py-1 rounded-full font-semibold bg-green-100 text-green-700">
                <TrendingUp className="w-3.5 h-3.5" />+{delta}% vs anterior
              </span>
            );
            if (delta < 0) return (
              <span className="flex items-center gap-1 text-sm px-3 py-1 rounded-full font-semibold bg-red-100 text-red-700">
                <TrendingDown className="w-3.5 h-3.5" />{delta}% vs anterior
              </span>
            );
            return (
              <span className="flex items-center gap-1 text-sm px-3 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">
                <Minus className="w-3.5 h-3.5" />Igual ao anterior
              </span>
            );
          })()}
        </div>
        <p className="text-gray-600 mt-3 text-sm">
          {data.score} de {data.totalQuestions} questões corretas
        </p>
        {!approved && (
          <p className="text-red-600 text-sm mt-2 font-medium">
            Você precisa de 65% (26/40) para aprovação. Continue estudando!
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{data.score}</p>
          <p className="text-xs text-gray-500">Acertos</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{data.totalQuestions - data.score}</p>
          <p className="text-xs text-gray-500">Erros</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <Clock className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{formatDuration(data.timeSpentSec)}</p>
          <p className="text-xs text-gray-500">Tempo</p>
        </div>
      </div>

      {/* Chapter performance */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-gray-900">Desempenho por Capítulo</h2>
        </div>
        <div className="space-y-3">
          {chapterPerformance.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 truncate max-w-[200px]">{c.title}</span>
                <span className={cn(
                  "text-xs font-bold",
                  c.pct >= 65 ? "text-green-600" : c.pct >= 50 ? "text-yellow-600" : "text-red-600"
                )}>
                  {c.correct}/{c.total} ({c.pct}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", c.pct >= 65 ? "bg-green-500" : c.pct >= 50 ? "bg-yellow-400" : "bg-red-400")}
                  style={{ width: `${c.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Revisão Detalhada</h2>
          <div className="flex gap-2">
            {(["all", "correct", "wrong"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition",
                  filter === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {f === "all" ? "Todas" : f === "correct" ? "Acertos" : "Erros"}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredAnswers.map((answer, idx) => {
            const q = answer.question;
            const isOpen = expanded === answer.id;

            return (
              <div key={answer.id}>
                <button
                  className="w-full flex items-start gap-3 px-6 py-4 text-left hover:bg-gray-50 transition"
                  onClick={() => setExpanded(isOpen ? null : answer.id)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {answer.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">Q{idx + 1}</span>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", DIFFICULTY_COLOR[q.difficulty])}>
                        {DIFFICULTY_LABEL[q.difficulty]}
                      </span>
                      {q.syllabusRef && (
                        <span className="text-xs text-gray-400 hidden sm:flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {q.syllabusRef}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-2">{q.statement}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 space-y-3">
                    {(["A", "B", "C", "D"] as const).map((key) => {
                      const text = q[`alternative${key}` as keyof typeof q] as string;
                      const expl = q[`explanation${key}` as keyof typeof q] as string;
                      const isCorrect = q.correctAnswer === key;
                      const isSelected = answer.selectedAnswer === key;

                      return (
                        <div
                          key={key}
                          className={cn(
                            "rounded-xl border-2 p-4",
                            isCorrect ? "border-green-400 bg-green-50" :
                            isSelected && !isCorrect ? "border-red-400 bg-red-50" :
                            "border-gray-100 bg-gray-50"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                              isCorrect ? "bg-green-500 text-white" :
                              isSelected && !isCorrect ? "bg-red-400 text-white" :
                              "bg-gray-200 text-gray-600"
                            )}>
                              {key}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{text}</p>
                              <p className="text-xs text-gray-500 mt-1">{expl}</p>
                              {isCorrect && (
                                <p className="text-xs text-green-700 font-medium mt-1">✓ Resposta correta</p>
                              )}
                              {isSelected && !isCorrect && (
                                <p className="text-xs text-red-600 font-medium mt-1">✗ Sua resposta</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-indigo-800 mb-1">Explicação Geral</p>
                      <p className="text-sm text-indigo-700">{q.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push("/simulation")}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition"
        >
          <PlayCircle className="w-4 h-4" />
          Novo Simulado
        </button>
        <Link
          href="/study-plan"
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
        >
          <BookOpen className="w-4 h-4" />
          Ver Plano de Estudos
        </Link>
      </div>
    </div>
  );
}
