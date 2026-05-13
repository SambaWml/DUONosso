"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Trophy,
  Target,
  Clock,
  BookOpen,
  PlayCircle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Flag,
} from "lucide-react";
import { cn, formatDuration, getScoreBadge } from "@/lib/utils";

interface QuestionData {
  id: string;
  statement: string;
  imageUrl?: string | null;
  alternativeA: string;
  alternativeB: string;
  alternativeC: string;
  alternativeD: string;
  correctAnswer: string;
  explanation: string;
  explanationA: string | null;
  explanationB: string | null;
  explanationC: string | null;
  explanationD: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  syllabusRef: string | null;
  chapterTitle: string;
}

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
    question?: {
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
    } | null;
    adminQuestion?: {
      id: string;
      statement: string;
      imageUrl: string | null;
      alternativeA: string;
      alternativeB: string;
      alternativeC: string;
      alternativeD: string;
      correctAnswer: string;
      explanation: string;
      explanationA: string | null;
      explanationB: string | null;
      explanationC: string | null;
      explanationD: string | null;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      syllabusRef: string | null;
      adminModule: { id: string; title: string };
    } | null;
  }[];
}

const DIFFICULTY_LABEL = { EASY: "Fácil", MEDIUM: "Médio", HARD: "Difícil" };
const DIFFICULTY_COLOR = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};

function normalizeQuestion(answer: SimulationData["answers"][number]): QuestionData | null {
  if (answer.adminQuestion) {
    const q = answer.adminQuestion;
    return {
      id: q.id,
      statement: q.statement,
      imageUrl: q.imageUrl,
      alternativeA: q.alternativeA,
      alternativeB: q.alternativeB,
      alternativeC: q.alternativeC,
      alternativeD: q.alternativeD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      explanationA: q.explanationA,
      explanationB: q.explanationB,
      explanationC: q.explanationC,
      explanationD: q.explanationD,
      difficulty: q.difficulty,
      syllabusRef: q.syllabusRef,
      chapterTitle: q.adminModule.title,
    };
  }
  if (answer.question) {
    const q = answer.question;
    return {
      id: q.id,
      statement: q.statement,
      imageUrl: null,
      alternativeA: q.alternativeA,
      alternativeB: q.alternativeB,
      alternativeC: q.alternativeC,
      alternativeD: q.alternativeD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      explanationA: q.explanationA,
      explanationB: q.explanationB,
      explanationC: q.explanationC,
      explanationD: q.explanationD,
      difficulty: q.difficulty,
      syllabusRef: q.syllabusRef,
      chapterTitle: q.chapter.title,
    };
  }
  return null;
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const newTrack = searchParams.get("newTrack") === "true";
  const [data, setData] = useState<SimulationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "correct" | "wrong">("all");
  const [prevPct, setPrevPct] = useState<number | null>(null);
  // Map: adminModuleId → { pathId, moduleId }
  const [moduleMap, setModuleMap] = useState<Record<string, { pathId: string; moduleId: string }>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [simPassThreshold, setSimPassThreshold] = useState(65);

  useEffect(() => {
    fetch(`/api/simulations?id=${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((s) => { if (s?.SIMULATION_PASS_THRESHOLD) setSimPassThreshold(s.SIMULATION_PASS_THRESHOLD); })
      .catch(() => {});
  }, [id]);

  // Load flags saved by simulation page
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ctfl-flags-${id}`);
      if (raw) setFlagged(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    if (!data) return;
    Promise.all([
      fetch("/api/simulations").then((r) => r.json()),
      fetch("/api/learning-paths").then((r) => r.json()),
    ]).then(([list, paths]) => {
      // Previous simulation score
      if (Array.isArray(list)) {
        const sorted = [...list].sort(
          (a: { createdAt: string }, b: { createdAt: string }) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const idx = sorted.findIndex((s: { id: string }) => s.id === data.id);
        if (idx !== -1 && idx < sorted.length - 1) {
          setPrevPct((sorted[idx + 1] as { percentage: number }).percentage);
        }
      }
      // Build adminModuleId → learning module map
      if (Array.isArray(paths)) {
        const map: Record<string, { pathId: string; moduleId: string }> = {};
        for (const path of paths as { id: string; modules: { id: string; adminModuleId: string | null }[] }[]) {
          for (const mod of path.modules) {
            if (mod.adminModuleId) map[mod.adminModuleId] = { pathId: path.id, moduleId: mod.id };
          }
        }
        setModuleMap(map);
      }
    }).catch(() => {});
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
  const approved = data.percentage >= simPassThreshold;

  const filteredAnswers = data.answers.filter((a) => {
    if (filter === "correct") return a.isCorrect;
    if (filter === "wrong") return !a.isCorrect;
    return true;
  });

  // Chapter performance
  const chapterMap: Record<string, { title: string; correct: number; total: number }> = {};
  for (const a of data.answers) {
    const q = normalizeQuestion(a);
    if (!q) continue;
    const key = q.id.slice(0, 8) + q.chapterTitle;
    const cid = (a.adminQuestion?.adminModule?.id ?? a.question?.chapter?.id ?? key);
    if (!chapterMap[cid]) chapterMap[cid] = { title: q.chapterTitle, correct: 0, total: 0 };
    chapterMap[cid].total++;
    if (a.isCorrect) chapterMap[cid].correct++;
  }
  const chapterPerformance = Object.entries(chapterMap)
    .map(([id, v]) => ({ id, ...v, pct: Math.round((v.correct / v.total) * 100) }))
    .sort((a, b) => a.pct - b.pct);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {newTrack && (
        <button
          onClick={() => router.push("/trilha")}
          className="w-full flex items-center gap-3 bg-indigo-600 text-white rounded-2xl px-5 py-4 hover:brightness-105 transition text-left shadow-[0_3px_0_#3E2EA0] active:translate-y-0.5 active:shadow-none"
        >
          <Flame className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Sua trilha de estudos foi criada!</p>
            <p className="text-xs text-indigo-200 mt-0.5">
              A IA montou seus módulos com base neste simulado — clique para começar
            </p>
          </div>
          <ChevronRight className="w-5 h-5 flex-shrink-0 text-indigo-300" />
        </button>
      )}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left column — result summary + stats + chapter performance */}
        <div className="flex-shrink-0 w-full lg:w-80 xl:w-96 space-y-4">
          {/* Result header */}
          <div className={cn(
            "rounded-2xl p-6 text-center",
            approved ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200" : "bg-gradient-to-br from-red-50 to-orange-50 border border-red-200"
          )}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: approved ? "#d1fae5" : "#fee2e2" }}>
              {approved ? <Trophy className="w-8 h-8 text-green-600" /> : <Target className="w-8 h-8 text-red-500" />}
            </div>
            <h1 className="text-4xl font-black text-[#1A1B2E] mb-1">{Math.round(data.percentage)}%</h1>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className={cn("text-sm px-3 py-1 rounded-full font-semibold", badge.color)}>{badge.label}</span>
              {prevPct !== null && (() => {
                const delta = Math.round(data.percentage) - Math.round(prevPct);
                if (delta > 0) return <span className="flex items-center gap-1 text-sm px-3 py-1 rounded-full font-semibold bg-green-100 text-green-700"><TrendingUp className="w-3.5 h-3.5" />+{delta}%</span>;
                if (delta < 0) return <span className="flex items-center gap-1 text-sm px-3 py-1 rounded-full font-semibold bg-red-100 text-red-700"><TrendingDown className="w-3.5 h-3.5" />{delta}%</span>;
                return <span className="flex items-center gap-1 text-sm px-3 py-1 rounded-full font-semibold bg-gray-100 text-gray-600"><Minus className="w-3.5 h-3.5" />Igual</span>;
              })()}
            </div>
            <p className="text-gray-600 mt-2 text-sm">{data.score} de {data.totalQuestions} corretas</p>
            {!approved && <p className="text-red-600 text-xs mt-2 font-medium">Meta: 65% (26/40) para aprovação</p>}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] p-4 text-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1.5" />
              <p className="text-2xl font-black text-[#1A1B2E]">{data.score}</p>
              <p className="text-xs text-gray-500">Acertos</p>
            </div>
            <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] p-4 text-center">
              <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1.5" />
              <p className="text-2xl font-black text-[#1A1B2E]">{data.totalQuestions - data.score}</p>
              <p className="text-xs text-gray-500">Erros</p>
            </div>
            <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] p-4 text-center">
              <Clock className="w-5 h-5 text-indigo-500 mx-auto mb-1.5" />
              <p className="text-xl font-black text-[#1A1B2E]">{formatDuration(data.timeSpentSec)}</p>
              <p className="text-xs text-gray-500">Tempo</p>
            </div>
          </div>

          {/* Chapter performance */}
          <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h2 className="font-extrabold text-[#1A1B2E]">Por Capítulo</h2>
            </div>
            <div className="space-y-3">
              {chapterPerformance.map((c) => {
                const modLink = moduleMap[c.id];
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-xs text-gray-700 truncate flex-1">{c.title}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn("text-xs font-bold", c.pct >= 65 ? "text-green-600" : c.pct >= 50 ? "text-yellow-600" : "text-red-600")}>
                          {c.correct}/{c.total}
                        </span>
                        {modLink && c.pct < 65 && (
                          <Link
                            href={`/trilha/${modLink.pathId}/modulo/${modLink.moduleId}`}
                            className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium hover:bg-indigo-100 transition"
                          >
                            Estudar
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", c.pct >= 65 ? "bg-green-500" : c.pct >= 50 ? "bg-yellow-400" : "bg-red-400")} style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button onClick={() => router.push("/simulation")}
              className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-extrabold text-sm uppercase tracking-wide hover:brightness-105 transition shadow-[0_3px_0_#3E2EA0] active:translate-y-0.5 active:shadow-none">
              <PlayCircle className="w-4 h-4" /> Novo Simulado
            </button>
            <Link href="/study-plan"
              className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-[#E9E4F2] text-gray-700 rounded-xl font-extrabold text-sm uppercase tracking-wide hover:bg-indigo-50 transition">
              <BookOpen className="w-4 h-4" /> Ver Plano de Estudos
            </Link>
          </div>
        </div>

        {/* Right column — detailed review */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9E4F2]">
              <h2 className="font-extrabold text-[#1A1B2E]">Revisão Detalhada</h2>
              <div className="flex gap-2">
                {(["all", "correct", "wrong"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition", filter === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                    {f === "all" ? "Todas" : f === "correct" ? "Acertos" : "Erros"}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-gray-100">
          {filteredAnswers.map((answer, idx) => {
            const q = normalizeQuestion(answer);
            if (!q) return null;
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
                      {flagged.has(q.id) && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Flag className="w-3 h-3" /> Marcada
                        </span>
                      )}
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
                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="Imagem da questão" className="rounded-lg max-h-64 object-contain border border-gray-200" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                    {(["A", "B", "C", "D"] as const).map((altKey) => {
                      const text = q[`alternative${altKey}` as keyof QuestionData] as string;
                      const expl = q[`explanation${altKey}` as keyof QuestionData] as string | null;
                      const isCorrect = q.correctAnswer === altKey;
                      const isSelected = answer.selectedAnswer === altKey;

                      return (
                        <div
                          key={altKey}
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
                              {altKey}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{text}</p>
                              {expl && <p className="text-xs text-gray-500 mt-1">{expl}</p>}
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
        </div>
      </div>
    </div>
  );
}
