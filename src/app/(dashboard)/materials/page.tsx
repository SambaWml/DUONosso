"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface Material {
  id: string;
  filename: string;
  fileSize: number;
  status: "PROCESSING" | "READY" | "ERROR";
  totalPages: number | null;
  createdAt: string;
  _count: { chapters: number };
  questionsCount: number;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/materials");
    const data = await res.json();
    setMaterials(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Remover este material e todas as questões geradas?")) return;
    setDeleting(id);
    await fetch(`/api/materials?id=${id}`, { method: "DELETE" });
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    setDeleting(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materiais</h1>
          <p className="text-gray-500 text-sm mt-1">PDFs enviados e processados.</p>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Upload className="w-4 h-4" />
          Enviar PDF
        </Link>
      </div>

      {materials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900 mb-1">Nenhum material ainda</p>
          <p className="text-gray-500 text-sm mb-6">Envie o syllabus CTFL em PDF para começar.</p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition"
          >
            <Upload className="w-4 h-4" />
            Enviar primeiro PDF
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4"
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                m.status === "READY" ? "bg-green-100" :
                m.status === "ERROR" ? "bg-red-100" : "bg-yellow-100"
              )}>
                {m.status === "READY" ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : m.status === "ERROR" ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <Clock className="w-6 h-6 text-yellow-600 animate-pulse" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{m.filename}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-xs text-gray-400">{formatDate(m.createdAt)}</span>
                  <span className="text-xs text-gray-400">
                    {(m.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  {m.totalPages && (
                    <span className="text-xs text-gray-400">{m.totalPages} páginas</span>
                  )}
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    m.status === "READY" ? "bg-green-100 text-green-700" :
                    m.status === "ERROR" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  )}>
                    {m.status === "READY"
                      ? `${m._count.chapters} cap · ${m.questionsCount} questões`
                      : m.status === "ERROR" ? "Erro" : "Processando..."}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={deleting === m.id}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                >
                  {deleting === m.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
