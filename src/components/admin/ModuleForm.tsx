"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  title: string;
  ctflChapter: number;
  orderIndex: number;
  summary: string;
  materialUrl?: string | null;
  isActive: boolean;
}

export function ModuleForm({ module }: { module?: Module }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewSummary, setPreviewSummary] = useState(false);
  const [form, setForm] = useState({
    title: module?.title ?? "",
    ctflChapter: module?.ctflChapter ?? 1,
    orderIndex: module?.orderIndex ?? 0,
    summary: module?.summary ?? "",
    materialUrl: module?.materialUrl ?? "",
    isActive: module?.isActive ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(module ? `/api/admin/modules/${module.id}` : "/api/admin/modules", {
      method: module ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Erro ao salvar.");
      return;
    }
    const data = await res.json();
    router.push(`/admin/modules/${data.id}`);
    router.refresh();
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setPreviewSummary((v) => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
            previewSummary
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          )}
        >
          {previewSummary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {previewSummary ? "Fechar preview" : "Ver preview do resumo"}
        </button>
      </div>
      <div className={cn("items-start", previewSummary ? "grid lg:grid-cols-2 gap-6" : "")}>
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] p-6 space-y-5">
          <h2 className="font-extrabold text-[#1A1B2E]">Dados do módulo</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Título</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="Ex: Fundamentos de Teste"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Capítulo CTFL</label>
              <select
                value={form.ctflChapter}
                onChange={(e) => setForm({ ...form, ctflChapter: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>Capítulo {n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-32">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Ordem</label>
            <input
              type="number"
              value={form.orderIndex}
              onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })}
              min={0}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Resumo de estudo (Markdown)</label>

            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              rows={18}
              required
              placeholder={"# Título\n\nConteúdo em markdown..."}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Material de apoio (URL)
            </label>
            <input
              type="url"
              value={form.materialUrl}
              onChange={(e) => setForm({ ...form, materialUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Opcional. PDF, Google Drive, YouTube — aparece como link de apoio na tela de estudo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Ativo (visível para usuários)</label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Salvando..." : "Salvar módulo"}
            </button>
          </div>
        </form>

        {/* Preview panel — only when tab is active */}
        {previewSummary && (
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pb-8">
            <div className="mb-3 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Preview do resumo
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4">
                <p className="font-semibold text-white text-sm">{form.title || "Título do módulo"}</p>
                <p className="text-xs text-indigo-200 mt-0.5">Capítulo {form.ctflChapter} — Resumo de estudo</p>
              </div>
              <div className="p-6 min-h-[20rem] text-sm text-gray-700 leading-relaxed">
                {form.summary.trim() ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 mt-4 mb-2 border-b border-gray-200 pb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 mt-5 mb-2 border-b border-gray-100 pb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold text-indigo-800 mt-4 mb-1">{children}</h3>,
                      p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-amber-400 bg-amber-50 rounded-r-lg px-4 py-3 my-3 text-sm text-amber-900">{children}</blockquote>,
                      table: ({ children }) => <div className="overflow-x-auto my-4 rounded-xl border border-gray-200"><table className="min-w-full text-xs border-collapse">{children}</table></div>,
                      thead: ({ children }) => <thead className="bg-indigo-50">{children}</thead>,
                      th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-indigo-800 border-b border-gray-200 whitespace-nowrap">{children}</th>,
                      td: ({ children }) => <td className="px-3 py-2 text-gray-700 border-b border-gray-100 align-top">{children}</td>,
                      code: ({ children }) => <code className="bg-gray-100 text-indigo-700 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                      pre: ({ children }) => <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto my-3 text-xs font-mono">{children}</pre>,
                      hr: () => <hr className="my-4 border-gray-200" />,
                    }}
                  >
                    {form.summary}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-400 italic">Nenhum conteúdo ainda. Escreva algo no editor à esquerda.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
