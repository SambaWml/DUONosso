"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PlayCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flag,
  BookOpen,
  Sparkles,
  Brain,
  ListChecks,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  statement: string;
  alternativeA: string;
  alternativeB: string;
  alternativeC: string;
  alternativeD: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  syllabusRef: string | null;
  chapterId: string;
  chapterTitle: string;
}

type Phase = "start" | "generating" | "running" | "submitting" | "error";

const TOTAL_SECONDS = 65 * 60;
const DRAFT_KEY = "ctfl-sim-draft";

interface SimDraft {
  questions: Question[];
  answers: Record<string, string>;
  currentIndex: number;
  elapsed: number;
  savedAt: number;
}

const DIFFICULTY_LABEL = { EASY: "Fácil", MEDIUM: "Médio", HARD: "Difícil" };
const DIFFICULTY_COLOR = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};

const GEN_STEPS = [
  { icon: BookOpen,   label: "Analisando materiais",         detail: "Verificando capítulos e conteúdo dos PDFs enviados..." },
  { icon: Brain,      label: "Gerando questões com IA",      detail: "GPT-4o criando questões no estilo oficial CTFL..." },
  { icon: ListChecks, label: "Aplicando distribuição CTFL",  detail: "Balanceando capítulos conforme syllabus v4.0 (K-levels)..." },
  { icon: Shuffle,    label: "Montando o simulado",          detail: "Selecionando e embaralhando as 40 questões finais..." },
];

export default function SimulationPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("start");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [genElapsed, setGenElapsed] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [draft, setDraft] = useState<SimDraft | null>(null);

  // Load draft from localStorage after mount (client-side only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as SimDraft;
      if (Date.now() - d.savedAt > 2 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      setDraft(d);
    } catch { /* ignore */ }
  }, []);

  // Auto-save draft while running
  useEffect(() => {
    if (phase !== "running" || questions.length === 0) return;
    const d: SimDraft = { questions, answers, currentIndex, elapsed, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  }, [phase, questions, answers, currentIndex, elapsed]);

  // Timer — counts up, but we show countdown from 65min
  useEffect(() => {
    if (phase !== "running") return;
    const interval = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= TOTAL_SECONDS) {
          clearInterval(interval);
          handleSubmit();
          return TOTAL_SECONDS;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startGenProgress() {
    setGenStep(0);
    setGenElapsed(0);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => setGenElapsed((s) => s + 1), 1000);

    // Animate through steps: 15% → 35% → 65% → 90% of a ~90s estimate
    const durations = [8000, 40000, 25000, 10000];
    let cur = 0;
    const advance = () => {
      cur++;
      if (cur < GEN_STEPS.length) {
        setGenStep(cur);
        stepTimerRef.current = setTimeout(advance, durations[cur]);
      }
    };
    stepTimerRef.current = setTimeout(advance, durations[0]);
  }

  function stopGenProgress() {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    setGenStep(GEN_STEPS.length - 1);
  }

  function resumeDraft() {
    if (!draft) return;
    setQuestions(draft.questions);
    setAnswers(draft.answers);
    setCurrentIndex(draft.currentIndex);
    setElapsed(draft.elapsed);
    setFlagged(new Set());
    setPhase("running");
  }

  async function startSimulation() {
    setError("");
    setPhase("generating");
    startGenProgress();

    const res = await fetch("/api/simulations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 40 }),
    });
    const data = await res.json();
    stopGenProgress();

    if (!res.ok) {
      setError(data.error || "Erro ao carregar questões.");
      setPhase("start");
      return;
    }
    // Clear draft only after questions load successfully
    setDraft(null);
    localStorage.removeItem(DRAFT_KEY);
    setQuestions(data);
    setCurrentIndex(0);
    setAnswers({});
    setElapsed(0);
    setFlagged(new Set());
    setPhase("running");
  }

  async function handleSubmit() {
    const unanswered = questions.filter((q) => !answers[q.id]).length;
    if (unanswered > 0) {
      if (!confirm(`Você ainda tem ${unanswered} questão(ões) sem resposta. Deseja entregar mesmo assim?`)) return;
    }

    setPhase("submitting");

    const res = await fetch("/api/simulations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedAnswer: answers[q.id] || "",
        })),
        timeSpentSec: elapsed,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.removeItem(DRAFT_KEY);
      if (data.pathsCreated > 0) {
        router.push("/trilha");
      } else {
        router.push(`/results/${data.simulationId}`);
      }
    } else {
      setError(data.error || "Erro ao enviar simulado.");
      setPhase("running");
    }
  }

  function formatCountdown(s: number) {
    const remaining = Math.max(0, TOTAL_SECONDS - s);
    const m = Math.floor(remaining / 60);
    const sec = remaining % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  const timeWarning = elapsed >= TOTAL_SECONDS - 10 * 60; // últimos 10min
  const timeCritical = elapsed >= TOTAL_SECONDS - 5 * 60;  // últimos 5min

  const current = questions[currentIndex];
  const answered = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0;

  if (phase === "start") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulado CTFL</h1>
          <p className="text-gray-500 text-sm mt-1">
            40 questões no padrão oficial ISTQB — distribuição por capítulo conforme syllabus v4.0.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-5">
            <PlayCircle className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Pronto para o simulado?</h2>
          <p className="text-gray-500 text-sm mb-8">
            Mesmo formato da prova oficial: 40 questões, 65 minutos, aprovação com 26 acertos (65%).
          </p>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6 text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">{error}</p>
                <p className="text-xs mt-1">Faça upload de um material antes de iniciar o simulado.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Questões", value: "40" },
              { label: "Aprovação", value: "65%" },
              { label: "Tempo", value: "65min" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {draft && (
            <button
              onClick={resumeDraft}
              className="w-full py-4 bg-white border-2 border-indigo-500 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition flex items-center justify-center gap-2 mb-3"
            >
              <Clock className="w-5 h-5" />
              Retomar simulado ({Object.keys(draft.answers).length}/40 respondidas)
            </button>
          )}
          <button
            onClick={startSimulation}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            {draft ? "Novo Simulado" : "Iniciar Simulado"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "generating") {
    const pct = Math.round(((genStep + 1) / GEN_STEPS.length) * 90);
    const formatSec = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preparando Simulado</h1>
          <p className="text-gray-500 text-sm mt-1">A IA está gerando questões com base nos seus materiais.</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-7 space-y-5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-indigo-700 font-medium">
              <Sparkles className="w-4 h-4 animate-pulse" />
              Gerando com GPT-4o
            </div>
            <span className="text-xs text-gray-400 tabular-nums">{formatSec(genElapsed)}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progresso</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-[3000ms] ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {GEN_STEPS.map((step, i) => {
              const Icon = step.icon;
              const done = i < genStep;
              const active = i === genStep;
              return (
                <div key={i} className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-500",
                  done   && "bg-green-50 border border-green-200",
                  active && "bg-white border border-indigo-300 shadow-sm",
                  !done && !active && "opacity-30"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    done   && "bg-green-500",
                    active && "bg-indigo-600",
                    !done && !active && "bg-gray-200"
                  )}>
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : <Icon className={cn("w-3.5 h-3.5", active ? "text-white animate-pulse" : "text-gray-400")} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      done   && "text-green-700",
                      active && "text-gray-900",
                      !done && !active && "text-gray-400"
                    )}>{step.label}</p>
                    {active && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
                  </div>
                  {active && (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((d) => (
                        <div key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                          style={{ animationDelay: `${d * 150}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-center text-gray-400">
            A geração acontece apenas na primeira vez. Próximos simulados iniciam instantaneamente.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="font-medium text-gray-900">Calculando resultado...</p>
          <p className="text-sm text-gray-500 mt-1">Gerando plano de estudos personalizado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1.5 text-sm font-bold tabular-nums px-2 py-1 rounded-lg",
            timeCritical ? "bg-red-100 text-red-700" :
            timeWarning  ? "bg-yellow-100 text-yellow-700" :
                           "text-gray-700"
          )}>
            <Clock className="w-4 h-4" />
            {formatCountdown(elapsed)}
          </div>
          <div className="text-sm text-gray-500">
            {answered}/{questions.length} respondidas
          </div>
        </div>

        <div className="flex-1 max-w-xs">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => setShowMap(!showMap)}
          className="text-sm text-indigo-600 font-medium hover:underline"
        >
          {showMap ? "Fechar mapa" : "Ver mapa"}
        </button>
      </div>

      {/* Question map */}
      {showMap && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Mapa de questões</p>
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => { setCurrentIndex(i); setShowMap(false); }}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-medium transition",
                  i === currentIndex ? "bg-indigo-600 text-white" :
                  answers[q.id] ? "bg-green-100 text-green-700" :
                  flagged.has(q.id) ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> Respondida</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 inline-block" /> Marcada</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Pendente</span>
          </div>
        </div>
      )}

      {/* Question */}
      {current && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-400">
                  Questão {currentIndex + 1} de {questions.length}
                </span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", DIFFICULTY_COLOR[current.difficulty])}>
                  {DIFFICULTY_LABEL[current.difficulty]}
                </span>
                {current.syllabusRef && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {current.syllabusRef}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{current.chapterTitle}</p>
            </div>
            <button
              onClick={() => {
                setFlagged((prev) => {
                  const next = new Set(prev);
                  next.has(current.id) ? next.delete(current.id) : next.add(current.id);
                  return next;
                });
              }}
              className={cn(
                "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition",
                flagged.has(current.id)
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-gray-100 text-gray-400 hover:bg-yellow-50 hover:text-yellow-500"
              )}
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>

          <p className="font-medium text-gray-900 mb-5 leading-relaxed">{current.statement}</p>

          <div className="space-y-3">
            {(["A", "B", "C", "D"] as const).map((key) => {
              const text = current[`alternative${key}` as keyof typeof current] as string;
              const selected = answers[current.id] === key;
              return (
                <button
                  key={key}
                  onClick={() => setAnswers((prev) => ({ ...prev, [current.id]: key }))}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                    selected
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <span className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5",
                    selected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                  )}>
                    {key}
                  </span>
                  <span className="text-sm text-gray-700 leading-relaxed">{text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Próxima <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            Entregar Simulado
          </button>
        )}
      </div>
    </div>
  );
}
