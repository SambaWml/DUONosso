"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  XCircle,
  Loader2,
  ChevronLeft,
  Trophy,
  RotateCcw,
  Flame,
  BookOpen,
  PlayCircle,
  ImageIcon,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Question {
  id: string;
  source?: "admin" | "ai";
  statement: string;
  imageUrl?: string | null;
  alternativeA: string;
  alternativeB: string;
  alternativeC: string;
  alternativeD: string;
  difficulty: string;
  syllabusRef?: string | null;
}

interface EvaluatedAnswer {
  questionId: string;
  selected: string;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  explanationA: string;
  explanationB: string;
  explanationC: string;
  explanationD: string;
  statement: string;
  imageUrl?: string | null;
  alternativeA: string;
  alternativeB: string;
  alternativeC: string;
  alternativeD: string;
  difficulty?: string;
  syllabusRef?: string | null;
}

type Phase = "loading" | "study" | "quiz" | "result" | "error";

const OPTIONS = ["A", "B", "C", "D"] as const;

function quizDraftKey(moduleId: string) { return `ctfl-quiz-${moduleId}`; }

interface QuizDraft {
  questions: Question[];
  answers: Array<{ questionId: string; selected: string }>;
  currentIdx: number;
  savedAt: number;
}

export default function ModulePage() {
  const { id: pathId, moduleId } = useParams<{ id: string; moduleId: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [moduleTitle, setModuleTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [materialUrl, setMaterialUrl] = useState<string | null>(null);
  const [startPage, setStartPage] = useState<number | null>(null);
  const [endPage, setEndPage] = useState<number | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Array<{ questionId: string; selected: string }>>([]);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    total: number;
    correct: number;
    evaluated: EvaluatedAnswer[];
  } | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [chapterId, setChapterId] = useState("");
  const [passThreshold, setPassThreshold] = useState(70);

  const loadQuestions = useCallback(async (forceNew = false) => {
    setPhase("loading");
    setSelected(null);
    setResult(null);

    // Resume from draft if available and not forcing a new attempt
    if (!forceNew) {
      try {
        const raw = localStorage.getItem(quizDraftKey(moduleId));
        if (raw) {
          const draft = JSON.parse(raw) as QuizDraft;
          // Discard drafts older than 2h
          if (Date.now() - draft.savedAt < 2 * 60 * 60 * 1000 && draft.questions.length > 0) {
            setQuestions(draft.questions);
            setAnswers(draft.answers);
            setCurrentIdx(draft.currentIdx);
            setPhase("quiz");
            return;
          }
          localStorage.removeItem(quizDraftKey(moduleId));
        }
      } catch { /* ignore */ }
    } else {
      localStorage.removeItem(quizDraftKey(moduleId));
      setAnswers([]);
      setCurrentIdx(0);
    }

    const res = await fetch(
      `/api/learning-paths/${pathId}/modules/${moduleId}/start`,
      { method: "POST" }
    );
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Erro ao carregar questões.");
      setPhase("error");
      return;
    }
    const data = await res.json();
    setQuestions(data.questions);
    setModuleTitle(data.moduleTitle);
    setChapterContent(data.chapterContent ?? "");
    setChapterId(data.chapterId ?? "");
    setPdfUrl(data.pdfUrl ?? null);
    setMaterialUrl(data.materialUrl ?? null);
    setStartPage(data.startPage ?? null);
    setEndPage(data.endPage ?? null);
    setPhase("study");
  }, [pathId, moduleId]);

  useEffect(() => {
    loadQuestions();
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((s) => { if (s?.MODULE_PASS_THRESHOLD) setPassThreshold(s.MODULE_PASS_THRESHOLD); })
      .catch(() => {});
  }, [loadQuestions]);

  // Persist quiz progress to localStorage while answering
  useEffect(() => {
    if (phase !== "quiz" || questions.length === 0) return;
    const draft: QuizDraft = { questions, answers, currentIdx, savedAt: Date.now() };
    localStorage.setItem(quizDraftKey(moduleId), JSON.stringify(draft));
  }, [phase, questions, answers, currentIdx, moduleId]);

  async function submitAnswers(finalAnswers: typeof answers) {
    setSubmitting(true);
    const res = await fetch(
      `/api/learning-paths/${pathId}/modules/${moduleId}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      }
    );
    const data = await res.json();
    localStorage.removeItem(quizDraftKey(moduleId));
    setSubmitting(false);
    setResult(data);
    setPhase("result");
  }

  function confirmAnswer() {
    if (!selected) return;
    const q = questions[currentIdx];
    const newAnswers = [...answers, { questionId: q.id, selected }];
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
    } else {
      submitAnswers(newAnswers);
    }
  }

  if (phase === "loading")
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-gray-500">Preparando módulo...</p>
        </div>
      </div>
    );

  if (phase === "error")
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <XCircle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-gray-700 font-medium">{error}</p>
        <button
          onClick={() => router.push(`/trilha/${pathId}`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          Voltar à trilha
        </button>
      </div>
    );

  // Study phase — read the chapter content before the quiz
  if (phase === "study")
    return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.push(`/trilha/${pathId}`)} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Estudo do módulo</p>
            <p className="font-semibold text-gray-900 truncate">{moduleTitle}</p>
          </div>
        </div>

        {/* 2-column layout on desktop */}
        <div className="flex gap-6 items-start">
          {/* Left — chapter content */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-amber-800">
              <BookOpen className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Leia o conteúdo antes de responder. Você precisa de <strong>{passThreshold}%</strong> de acertos para avançar.</span>
            </div>

            {pdfUrl && startPage && (
              <PdfPageViewer pdfUrl={pdfUrl} startPage={startPage} endPage={endPage ?? startPage} />
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" /> {moduleTitle}
              </h2>
              <div className="text-sm text-gray-700 leading-relaxed">
                {chapterContent ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 mt-5 mb-2 border-b border-gray-100 pb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold text-indigo-800 mt-4 mb-1">{children}</h3>,
                    p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    blockquote: ({ children }) => {
                      const text = typeof children === "string" ? children : Array.isArray(children) ? children.map((c) => (typeof c === "string" ? c : (c as { props?: { children?: string } })?.props?.children ?? "")).join("") : "";
                      const isFigure = /figura|figure|diagrama|diagram|imagem|image/i.test(text);
                      if (isFigure && pdfUrl) {
                        return (
                          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 my-3 cursor-pointer hover:bg-indigo-100 transition" onClick={() => { const el = document.getElementById("pdf-viewer-toggle"); if (el) { el.click(); el.scrollIntoView({ behavior: "smooth", block: "center" }); } }}>
                            <ImageIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-indigo-800">{text || "Figura no PDF"}</p>
                              <p className="text-xs text-indigo-600 mt-0.5">Clique para abrir o PDF e ver a imagem original</p>
                            </div>
                          </div>
                        );
                      }
                      return <blockquote className="border-l-4 border-amber-400 bg-amber-50 rounded-r-lg px-4 py-3 my-3 text-sm text-amber-900">{children}</blockquote>;
                    },
                    table: ({ children }) => <div className="overflow-x-auto my-4 rounded-xl border border-gray-200"><table className="min-w-full text-xs border-collapse">{children}</table></div>,
                    thead: ({ children }) => <thead className="bg-indigo-50">{children}</thead>,
                    th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-indigo-800 border-b border-gray-200 whitespace-nowrap">{children}</th>,
                    td: ({ children }) => <td className="px-3 py-2 text-gray-700 border-b border-gray-100 align-top">{children}</td>,
                    code: ({ children }) => <code className="bg-gray-100 text-indigo-700 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                    pre: ({ children }) => <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto my-3 text-xs font-mono">{children}</pre>,
                    hr: () => <hr className="my-4 border-gray-200" />,
                  }}>
                    {chapterContent}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-400 italic">Conteúdo do capítulo não disponível.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right — sticky action panel */}
          <div className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0 sticky top-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Módulo</p>
                <p className="font-semibold text-gray-900 text-sm">{moduleTitle}</p>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">1</span>
                  <span>Leia o resumo à esquerda</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">2</span>
                  <span>Responda 10 questões</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-600 flex-shrink-0">3</span>
                  <span>Acerte {passThreshold}% para avançar</span>
                </div>
              </div>
              <button
                onClick={() => setPhase("quiz")}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-5 h-5" /> Iniciar Quiz
              </button>
            </div>

            {materialUrl && (
              <a
                href={materialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-800 hover:bg-blue-100 transition"
              >
                <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Material de apoio</p>
                  <p className="text-xs text-blue-600 mt-0.5">Abrir recurso externo</p>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Mobile start button */}
        <div className="lg:hidden mt-5 space-y-3">
          {materialUrl && (
            <a href={materialUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
              <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>Material de apoio</span>
            </a>
          )}
          <button onClick={() => setPhase("quiz")} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2 text-lg">
            <PlayCircle className="w-5 h-5" /> Pronto! Iniciar Quiz →
          </button>
        </div>
      </div>
    );

  if (phase === "result" && result) {
    const passed = result.passed;
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div
          className={cn(
            "rounded-2xl p-8 text-center space-y-3",
            passed
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200"
              : "bg-gradient-to-br from-red-50 to-rose-50 border border-red-200"
          )}
        >
          <div className="flex justify-center">
            {passed ? (
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-green-500" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
            )}
          </div>
          <div>
            <p className={cn("text-4xl font-bold", passed ? "text-green-700" : "text-red-700")}>
              {result.score}%
            </p>
            <p className={cn("text-lg font-semibold mt-1", passed ? "text-green-800" : "text-red-800")}>
              {passed ? "Módulo Concluído!" : "Tente Novamente"}
            </p>
            <p className={cn("text-sm mt-1", passed ? "text-green-600" : "text-red-600")}>
              {result.correct} de {result.total} corretas
              {passed ? " · Próximo módulo desbloqueado!" : ` · Precisa de ${passThreshold}% para avançar`}
            </p>
          </div>
        </div>

        {result.evaluated.filter((e) => !e.correct).length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm">Questões erradas:</h3>
            {result.evaluated
              .filter((e) => !e.correct)
              .map((e, i) => (
                <div key={i} className="bg-white border border-red-200 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-900">{e.statement}</p>
                  {e.imageUrl && (
                    <img src={e.imageUrl} alt="Imagem da questão" className="rounded-lg max-h-48 object-contain w-full border border-gray-200" />
                  )}
                  {OPTIONS.map((opt) => {
                    const text = e[`alternative${opt}` as keyof EvaluatedAnswer] as string;
                    const isCorrect = e.correctAnswer === opt;
                    const isSelected = e.selected === opt;
                    return (
                      <div
                        key={opt}
                        className={cn(
                          "flex items-start gap-2 text-xs rounded-lg px-3 py-2",
                          isCorrect && "bg-green-50 text-green-800",
                          isSelected && !isCorrect && "bg-red-50 text-red-800",
                          !isCorrect && !isSelected && "text-gray-500"
                        )}
                      >
                        <span className="font-bold flex-shrink-0">{opt})</span>
                        <span>{text}</span>
                      </div>
                    );
                  })}
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mt-1">
                    {e.explanation}
                  </p>
                </div>
              ))}
          </div>
        )}

        <div className="flex gap-3">
          {!passed && (
            <button
              onClick={() => loadQuestions(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Tentar novamente
            </button>
          )}
          <button
            onClick={() => router.push(`/trilha/${pathId}`)}
            className={cn(
              "flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition",
              passed
                ? "flex-1 bg-green-600 text-white hover:bg-green-700"
                : "flex-1 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            )}
          >
            {passed ? "Ver trilha" : "Voltar"}
          </button>
        </div>
      </div>
    );
  }

  // Quiz phase
  const q = questions[currentIdx];
  const progress = (currentIdx / questions.length) * 100;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPhase("study")}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-500 truncate">{moduleTitle}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {currentIdx + 1}/{questions.length}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex items-start gap-2">
          <Flame className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-gray-900 font-medium leading-relaxed">{q.statement}</p>
        </div>
        {q.imageUrl && (
          <img src={q.imageUrl} alt="Imagem da questão" className="rounded-xl border border-gray-200 max-h-64 object-contain w-full" />
        )}

        <div className="space-y-2.5">
          {OPTIONS.map((opt) => {
            const text = q[`alternative${opt}` as keyof Question] as string;
            const isSelected = selected === opt;
            return (
              <button
                key={opt}
                onClick={() => setSelected(opt)}
                className={cn(
                  "w-full text-left flex items-start gap-3 rounded-xl px-4 py-3 border-2 transition-all",
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700"
                )}
              >
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                    isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
                  )}
                >
                  {opt}
                </span>
                <span className="text-sm leading-relaxed">{text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={confirmAnswer}
        disabled={!selected || submitting}
        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-lg"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Avaliando...
          </span>
        ) : currentIdx < questions.length - 1 ? (
          "Confirmar"
        ) : (
          "Finalizar"
        )}
      </button>
    </div>
  );
}

function PdfPageViewer({
  pdfUrl,
  startPage,
  endPage,
}: {
  pdfUrl: string;
  startPage: number;
  endPage: number;
}) {
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(startPage);
  const totalPages = endPage - startPage + 1;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header — always visible, acts as toggle */}
      <button
        id="pdf-viewer-toggle"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
      >
        <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          Páginas do PDF original
          <span className="text-gray-400">({totalPages} {totalPages === 1 ? "página" : "páginas"})</span>
        </span>
        <span className="text-xs text-indigo-600 font-medium">
          {open ? "▲ Fechar" : "▼ Abrir PDF"}
        </span>
      </button>

      {open && (
        <>
          <div className="flex items-center justify-end gap-2 px-4 py-1.5 border-t border-gray-100 bg-gray-50">
            <button
              disabled={currentPage <= startPage}
              onClick={() => setCurrentPage((p) => Math.max(startPage, p - 1))}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 transition"
            >
              ‹ Ant
            </button>
            <span className="text-xs text-gray-500">
              {currentPage - startPage + 1}/{totalPages}
            </span>
            <button
              disabled={currentPage >= endPage}
              onClick={() => setCurrentPage((p) => Math.min(endPage, p + 1))}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 transition"
            >
              Próx ›
            </button>
          </div>
          <iframe
            key={currentPage}
            src={`${pdfUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full"
            style={{ height: "520px", border: "none" }}
            title={`PDF página ${currentPage}`}
          />
        </>
      )}
    </div>
  );
}
