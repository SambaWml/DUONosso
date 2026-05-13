"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Sparkles, Clock, X, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SlotStatus = "idle" | "uploading" | "processing" | "done" | "error";

interface Slot {
  type: "SYLLABUS" | "EXAM";
  label: string;
  description: string;
  file: File | null;
  status: SlotStatus;
  error: string;
  progress: number;
  materialId: string;
  chapterCount: number;
}

function makeSlots(): Slot[] {
  return [
    { type: "SYLLABUS", label: "Syllabus CTFL", description: "PDF oficial do syllabus ISTQB Foundation Level", file: null, status: "idle", error: "", progress: 0, materialId: "", chapterCount: 0 },
    { type: "EXAM",     label: "Prova Anterior", description: "PDF de simulado ou prova real para referência", file: null, status: "idle", error: "", progress: 0, materialId: "", chapterCount: 0 },
  ];
}

export default function UploadPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>(makeSlots());
  const [dragging, setDragging] = useState<number | null>(null);
  const pollRefs = useRef<(ReturnType<typeof setInterval> | null)[]>([null, null]);

  function update(idx: number, patch: Partial<Slot>) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function handleFile(idx: number, f: File) {
    if (f.type !== "application/pdf") { update(idx, { error: "Apenas PDFs são aceitos." }); return; }
    if (f.size > 20 * 1024 * 1024) { update(idx, { error: "Arquivo muito grande. Máximo 20MB." }); return; }
    update(idx, { file: f, error: "", status: "idle" });
  }

  function onDrop(idx: number, e: React.DragEvent) {
    e.preventDefault();
    setDragging(null);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(idx, f);
  }

  function startPolling(idx: number, id: string) {
    if (pollRefs.current[idx]) clearInterval(pollRefs.current[idx]!);
    pollRefs.current[idx] = setInterval(async () => {
      try {
        const res = await fetch(`/api/materials?materialId=${id}`);
        const data = await res.json();
        if (data?.status === "READY") {
          clearInterval(pollRefs.current[idx]!);
          update(idx, { status: "done", progress: 100, chapterCount: data?._count?.chapters ?? 0 });
        } else if (data?.status === "ERROR") {
          clearInterval(pollRefs.current[idx]!);
          update(idx, { status: "error", error: "Erro ao processar. Tente novamente." });
        }
      } catch { /* ignora erros de rede transientes */ }
    }, 3000);
  }

  async function uploadSlot(idx: number, slot: Slot) {
    if (!slot.file) return;
    update(idx, { status: "uploading", error: "", progress: 10 });
    const formData = new FormData();
    formData.append("file", slot.file);
    formData.append("type", slot.type);
    try {
      const res = await fetch("/api/materials", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { update(idx, { status: "error", error: data.error || "Erro ao enviar." }); return; }
      update(idx, { status: "processing", materialId: data.materialId, progress: 20 });
      startPolling(idx, data.materialId);
    } catch {
      update(idx, { status: "error", error: "Erro de conexão." });
    }
  }

  async function handleUpload() {
    const toUpload = slots.map((s, i) => ({ slot: s, idx: i })).filter(({ slot }) => slot.file && slot.status === "idle");
    await Promise.all(toUpload.map(({ slot, idx }) => uploadSlot(idx, slot)));
  }

  const hasAny = slots.some((s) => s.file);
  const anyBusy = slots.some((s) => s.status === "uploading" || s.status === "processing");
  const allDone = slots.filter((s) => s.file).every((s) => s.status === "done");

  if (allDone && hasAny) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="border border-green-200 bg-green-50 rounded-2xl p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {slots.filter((s) => s.status === "done").length === 2 ? "Dois materiais prontos!" : "Material pronto!"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {slots.filter((s) => s.status === "done").map((s) =>
                s.chapterCount > 0 ? `${s.label}: ${s.chapterCount} capítulos` : s.label
              ).join(" · ")}
              . Agora faça o simulado diagnóstico.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/simulation")}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-extrabold text-sm uppercase tracking-wide hover:brightness-105 transition flex items-center justify-center gap-2 shadow-[0_3px_0_#3E2EA0] active:translate-y-0.5 active:shadow-none"
        >
          <Sparkles className="w-4 h-4" />
          Fazer Simulado Diagnóstico
        </button>
        <button
          onClick={() => setSlots(makeSlots())}
          className="w-full py-2.5 bg-white text-gray-500 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition"
        >
          Enviar mais arquivos
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#1A1B2E]">Upload de Materiais</h1>
        <p className="text-gray-500 text-sm mt-1">
          Envie o syllabus e uma prova anterior juntos — processamento em paralelo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {slots.map((slot, idx) => (
          <SlotCard
            key={slot.type}
            slot={slot}
            dragging={dragging === idx}
            onDragOver={(e) => { e.preventDefault(); setDragging(idx); }}
            onDragLeave={() => setDragging(null)}
            onDrop={(e) => onDrop(idx, e)}
            onFileChange={(f) => handleFile(idx, f)}
            onRemove={() => update(idx, { file: null, error: "", status: "idle", progress: 0 })}
          />
        ))}
      </div>

      {hasAny && !anyBusy && !allDone && (
        <button
          onClick={handleUpload}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-extrabold text-sm uppercase tracking-wide hover:brightness-105 transition flex items-center justify-center gap-2 shadow-[0_3px_0_#3E2EA0] active:translate-y-0.5 active:shadow-none"
        >
          <Upload className="w-4 h-4" />
          Enviar e Processar {slots.filter((s) => s.file).length === 2 ? "os 2 arquivos" : "arquivo"}
        </button>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h3 className="font-semibold text-blue-900 text-sm mb-2">Como funciona?</h3>
        <ol className="space-y-1.5 text-sm text-blue-800">
          <li>1. Envie o syllabus e/ou uma prova anterior em PDF</li>
          <li>2. A IA extrai capítulos e gera questões automaticamente</li>
          <li>3. Faça o simulado diagnóstico com 40 questões</li>
          <li>4. A IA analisa seus erros e cria sua trilha personalizada</li>
          <li>5. Estude cada módulo e faça o simulado final</li>
        </ol>
      </div>
    </div>
  );
}

function SlotCard({
  slot, dragging,
  onDragOver, onDragLeave, onDrop,
  onFileChange, onRemove,
}: {
  slot: Slot;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (f: File) => void;
  onRemove: () => void;
}) {
  const inputId = `file-input-${slot.type}`;
  const busy = slot.status === "uploading" || slot.status === "processing";
  const done = slot.status === "done";
  const hasError = slot.status === "error";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full",
          slot.type === "SYLLABUS" ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"
        )}>
          {slot.label}
        </span>
      </div>
      <p className="text-xs text-gray-500">{slot.description}</p>

      {/* Drop zone */}
      {!busy && !done && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !slot.file && document.getElementById(inputId)?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-6 text-center transition-all",
            dragging ? "border-indigo-500 bg-indigo-50" :
            slot.file ? "border-indigo-400 bg-indigo-50 cursor-default" :
            "border-gray-300 hover:border-indigo-400 hover:bg-gray-50 cursor-pointer"
          )}
        >
          <input
            id={inputId}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])}
          />
          {slot.file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 break-all line-clamp-2">{slot.file.name}</p>
              <p className="text-xs text-gray-400">{(slot.file.size / (1024 * 1024)).toFixed(1)} MB</p>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition"
              >
                <X className="w-3 h-3" /> Remover
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">Arraste ou clique</p>
              <p className="text-xs text-gray-400">PDF até 20MB</p>
            </div>
          )}
        </div>
      )}

      {/* Uploading */}
      {slot.status === "uploading" && (
        <div className="border border-indigo-200 bg-indigo-50 rounded-2xl p-5 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm font-medium text-gray-700">Enviando...</p>
          <p className="text-xs text-gray-500 truncate">{slot.file?.name}</p>
        </div>
      )}

      {/* Processing */}
      {slot.status === "processing" && (
        <div className="border border-indigo-200 bg-indigo-50 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 flex-shrink-0" />
            <p className="text-sm font-medium text-indigo-900">Processando com IA...</p>
          </div>
          <p className="text-xs text-gray-500 truncate">{slot.file?.name}</p>
          <div className="flex items-center gap-1.5 text-xs text-indigo-700">
            <Clock className="w-3 h-3" />
            <span>Isso pode levar alguns minutos</span>
          </div>
          <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full animate-pulse w-3/5" />
          </div>
        </div>
      )}

      {/* Done */}
      {done && (
        <div className="border border-green-200 bg-green-50 rounded-2xl p-5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-green-800">
              Pronto!{slot.chapterCount > 0 ? ` · ${slot.chapterCount} capítulos` : ""}
            </p>
            <p className="text-xs text-gray-500 truncate">{slot.file?.name}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {hasError && (
        <div className="border border-red-200 bg-red-50 rounded-2xl p-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs text-red-700">{slot.error}</p>
            <button
              onClick={onRemove}
              className="text-xs text-red-500 underline mt-1"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
