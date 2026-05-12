"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, BookOpen, Sparkles, Clock, AlertCircle, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface StudyPlan {
  id: string;
  content: string;
  weakAreas: string[];
  updatedAt: string;
}

export default function StudyPlanPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [pathsCreated, setPathsCreated] = useState(0);

  async function loadPlan() {
    const res = await fetch("/api/study-plan");
    const data = await res.json();
    setPlan(data);
    setLoading(false);
  }

  useEffect(() => { loadPlan(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setPathsCreated(0);
    const res = await fetch("/api/study-plan", { method: "POST" });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error || "Erro ao gerar plano.");
    } else {
      setPlan(data);
      if (data.pathsCreated > 0) setPathsCreated(data.pathsCreated);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plano de Estudos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Plano personalizado gerado por IA com base nos seus erros.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
          ) : plan ? (
            <><RefreshCw className="w-4 h-4" /> Atualizar</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Gerar Plano</>
          )}
        </button>
      </div>

      {pathsCreated > 0 && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
          <span className="text-lg">🔥</span>
          <div className="flex-1">
            <p className="font-semibold">
              {pathsCreated === 1 ? "1 trilha de estudos criada" : `${pathsCreated} trilhas de estudos criadas`} automaticamente!
            </p>
            <button
              onClick={() => { window.location.href = "/trilha"; }}
              className="text-green-700 underline text-xs mt-0.5"
            >
              Ver trilha de estudos →
            </button>
          </div>
          <button onClick={() => setPathsCreated(0)} className="text-green-600 hover:text-green-800 transition flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">{error}</p>
            <p className="text-xs mt-0.5">Realize ao menos um simulado para gerar o plano.</p>
          </div>
        </div>
      )}

      {generating && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-8 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="font-medium text-gray-900 mb-1">Analisando seu desempenho...</p>
          <p className="text-sm text-gray-500">
            A IA está criando um plano personalizado baseado nos seus erros nos simulados. Aguarde alguns segundos.
          </p>
        </div>
      )}

      {!plan && !generating && !error && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <p className="font-semibold text-gray-900 mb-2">Nenhum plano gerado ainda</p>
          <p className="text-gray-500 text-sm mb-6">
            Realize pelo menos um simulado e depois clique em "Gerar Plano" para criar seu plano personalizado.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
            <p className="text-sm font-medium text-blue-900 mb-2">Como funciona:</p>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• A IA analisa seus erros por capítulo</li>
              <li>• Cria um cronograma de estudos semanal</li>
              <li>• Sugere técnicas para cada área fraca</li>
              <li>• Define metas de progresso realistas</li>
            </ul>
          </div>
        </div>
      )}

      {plan && !generating && (
        <>
          {plan.weakAreas.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <p className="text-sm font-semibold text-gray-900">Áreas identificadas para foco</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {plan.weakAreas.map((area, i) => (
                  <span key={i} className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs rounded-full font-medium">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <p className="text-sm font-medium text-gray-700">Gerado por IA</p>
              <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                Atualizado em {formatDate(plan.updatedAt)}
              </span>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 mt-5 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold text-gray-900 mt-5 mb-2 border-b border-gray-100 pb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold text-indigo-800 mt-4 mb-1">{children}</h3>,
                  p: ({ children }) => <p className="mb-3 leading-relaxed text-sm text-gray-700">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1 text-sm">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1 text-sm">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed text-gray-700">{children}</li>,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4 rounded-xl border border-gray-200">
                      <table className="min-w-full text-xs border-collapse">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-indigo-50">{children}</thead>,
                  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-indigo-800 border-b border-gray-200">{children}</th>,
                  td: ({ children }) => <td className="px-3 py-2 text-gray-700 border-b border-gray-100">{children}</td>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-300 bg-indigo-50 rounded-r-lg px-4 py-3 my-3 text-sm text-indigo-900">{children}</blockquote>,
                  hr: () => <hr className="my-4 border-gray-200" />,
                }}
              >
                {plan.content}
              </ReactMarkdown>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

