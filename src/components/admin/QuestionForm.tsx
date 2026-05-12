"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Upload, Eye, EyeOff, CheckCircle2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionData {
  id: string;
  adminModuleId: string;
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
  difficulty: string;
  syllabusRef: string | null;
  orderIndex: number;
  isActive: boolean;
}

interface AdminModule { id: string; title: string; ctflChapter: number }

const DIFF_LABEL: Record<string, string> = { EASY: "Fácil", MEDIUM: "Médio", HARD: "Difícil" };
const DIFF_COLOR: Record<string, string> = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};

export function QuestionForm({
  question,
  modules,
  defaultModuleId,
}: {
  question?: QuestionData;
  modules: AdminModule[];
  defaultModuleId?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({
    adminModuleId: question?.adminModuleId ?? defaultModuleId ?? modules[0]?.id ?? "",
    statement: question?.statement ?? "",
    imageUrl: question?.imageUrl ?? "",
    alternativeA: question?.alternativeA ?? "",
    alternativeB: question?.alternativeB ?? "",
    alternativeC: question?.alternativeC ?? "",
    alternativeD: question?.alternativeD ?? "",
    correctAnswer: question?.correctAnswer ?? "A",
    explanation: question?.explanation ?? "",
    explanationA: question?.explanationA ?? "",
    explanationB: question?.explanationB ?? "",
    explanationC: question?.explanationC ?? "",
    explanationD: question?.explanationD ?? "",
    difficulty: question?.difficulty ?? "MEDIUM",
    syllabusRef: question?.syllabusRef ?? "",
    orderIndex: question?.orderIndex ?? 0,
    isActive: question?.isActive ?? true,
  });

  const alts = ["A", "B", "C", "D"] as const;

  async function handleImageUpload(file: File) {
    setUploading(true);
    setUploadError("");
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setUploadError(data.error ?? "Erro ao enviar imagem.");
      return;
    }
    setForm((f) => ({ ...f, imageUrl: data.url }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(
      question ? `/api/admin/questions/${question.id}` : "/api/admin/questions",
      {
        method: question ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Erro ao salvar.");
      return;
    }
    router.push(`/admin/modules/${form.adminModuleId}`);
    router.refresh();
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
            showPreview
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          )}
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPreview ? "Fechar preview" : "Ver preview"}
        </button>
      </div>
      <div className={cn("items-start", showPreview ? "grid lg:grid-cols-2 gap-6" : "")}>
        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dados da questão */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Dados da questão</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Módulo</label>
                <select
                  value={form.adminModuleId}
                  onChange={(e) => setForm({ ...form, adminModuleId: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>Cap. {m.ctflChapter} — {m.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Dificuldade</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="EASY">Fácil</option>
                  <option value="MEDIUM">Médio</option>
                  <option value="HARD">Difícil</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Referência Syllabus</label>
                <input
                  type="text"
                  value={form.syllabusRef}
                  onChange={(e) => setForm({ ...form, syllabusRef: e.target.value })}
                  placeholder="FL-1.1.1"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Ordem</label>
                <input
                  type="number"
                  value={form.orderIndex}
                  onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })}
                  min={0}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Enunciado</label>
              <textarea
                value={form.statement}
                onChange={(e) => setForm({ ...form, statement: e.target.value })}
                rows={5}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>

            {/* Image */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Imagem (opcional)</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? "Enviando..." : "Enviar arquivo"}
                  </button>
                  <span className="flex items-center text-xs text-gray-400 px-1">ou</span>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="colar URL da imagem..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: "" })}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = "";
                  }}
                />

                {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
                <p className="text-xs text-gray-400">JPG, PNG, GIF ou WebP · máx 5 MB</p>

                {form.imageUrl && (
                  <div className="relative inline-block">
                    <img
                      src={form.imageUrl}
                      alt="preview"
                      className="max-h-40 rounded-xl border border-gray-200 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: "" })}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alternativas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Alternativas</h2>
            <p className="text-xs text-gray-400">Clique no círculo para marcar a correta.</p>

            {alts.map((alt) => (
              <div
                key={alt}
                className={cn(
                  "flex gap-3 items-start p-3.5 rounded-xl border-2 transition-colors",
                  form.correctAnswer === alt ? "border-emerald-400 bg-emerald-50" : "border-gray-100 hover:border-gray-200"
                )}
              >
                <button
                  type="button"
                  onClick={() => setForm({ ...form, correctAnswer: alt })}
                  className={cn(
                    "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-colors mt-0.5",
                    form.correctAnswer === alt
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-600"
                  )}
                >
                  {alt}
                </button>
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    value={form[`alternative${alt}` as keyof typeof form] as string}
                    onChange={(e) => setForm({ ...form, [`alternative${alt}`]: e.target.value })}
                    required
                    placeholder={`Alternativa ${alt}`}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={form[`explanation${alt}` as keyof typeof form] as string}
                    onChange={(e) => setForm({ ...form, [`explanation${alt}`]: e.target.value })}
                    placeholder={`Explicação da alternativa ${alt} (opcional)`}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Explicação geral */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Explicação geral</h2>
            <textarea
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              rows={4}
              required
              placeholder="Por que a alternativa correta está certa..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActiveQ"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActiveQ" className="text-sm text-gray-700">Ativa (usada nos simulados)</label>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

          <div className="flex justify-end pb-8">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Salvando..." : "Salvar questão"}
            </button>
          </div>
        </form>

        {/* ── Preview ──────────────────────────────────────────────────────── */}
        {showPreview && (
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pb-8">
            <div className="mb-3 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Como vai aparecer no simulado
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Preview header band */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-indigo-200">Questão</span>
                    {form.difficulty && (
                      <span className={cn(
                        "text-xs px-2.5 py-0.5 rounded-full font-semibold",
                        form.difficulty === "EASY" ? "bg-green-400/20 text-green-200 border border-green-400/30"
                          : form.difficulty === "MEDIUM" ? "bg-yellow-400/20 text-yellow-200 border border-yellow-400/30"
                          : "bg-red-400/20 text-red-200 border border-red-400/30"
                      )}>
                        {DIFF_LABEL[form.difficulty] ?? form.difficulty}
                      </span>
                    )}
                    {form.syllabusRef && (
                      <span className="text-xs text-indigo-300 font-mono">{form.syllabusRef}</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-indigo-200 mt-1.5">
                  {modules.find((m) => m.id === form.adminModuleId)?.title ?? ""}
                </p>
              </div>

              <div className="p-6 space-y-5">
                {/* Statement */}
                <p className="font-medium text-gray-900 leading-relaxed">
                  {form.statement || <span className="text-gray-300 italic text-sm">Enunciado não preenchido...</span>}
                </p>

                {/* Image */}
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt="Imagem da questão"
                    className="max-h-64 rounded-xl border border-gray-200 object-contain w-full"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-300 border border-dashed border-gray-200 rounded-xl p-4">
                    <ImageIcon className="w-4 h-4" /> Sem imagem
                  </div>
                )}

                {/* Alternatives */}
                <div className="space-y-2">
                  {alts.map((alt) => {
                    const text = form[`alternative${alt}` as keyof typeof form] as string;
                    const isCorrect = form.correctAnswer === alt;
                    return (
                      <div
                        key={alt}
                        className={cn(
                          "flex items-start gap-3 p-3.5 rounded-xl border-2 transition-colors",
                          isCorrect ? "border-emerald-400 bg-emerald-50" : "border-gray-100 bg-gray-50"
                        )}
                      >
                        <span className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                          isCorrect ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-600"
                        )}>
                          {alt}
                        </span>
                        <span className="text-sm text-gray-700 leading-relaxed flex-1">
                          {text || <span className="text-gray-300 italic">Alternativa {alt} vazia</span>}
                        </span>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {form.explanation && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-indigo-700 mb-1.5">Explicação Geral</p>
                    <p className="text-sm text-indigo-800 leading-relaxed">{form.explanation}</p>
                  </div>
                )}

                {/* Per-alternative explanations */}
                {alts.some((alt) => (form[`explanation${alt}` as keyof typeof form] as string)?.trim()) && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500">Explicações por alternativa</p>
                    {alts.map((alt) => {
                      const expText = form[`explanation${alt}` as keyof typeof form] as string;
                      if (!expText?.trim()) return null;
                      return (
                        <div key={alt} className="flex gap-2.5 text-sm">
                          <span className={cn(
                            "w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                            form.correctAnswer === alt ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-600"
                          )}>
                            {alt}
                          </span>
                          <p className="text-gray-600 text-xs leading-relaxed">{expText}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
