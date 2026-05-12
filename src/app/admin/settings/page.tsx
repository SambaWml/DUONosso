"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, CheckCircle2, AlertCircle, Settings2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingMeta = {
  value: number;
  default: number;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
};

type Settings = Record<string, SettingMeta>;

const GROUPS = [
  {
    title: "Trilha de Aprendizado",
    keys: ["MODULE_PASS_THRESHOLD", "MODULE_QUIZ_QUESTION_COUNT", "ESTIMATED_MODULE_DURATION_MINUTES"],
  },
  {
    title: "Simulado",
    keys: ["SIMULATION_PASS_THRESHOLD", "SIMULATION_QUESTION_COUNT", "SIMULATION_TIME_LIMIT_MINUTES", "MIN_QUESTIONS_FOR_SIMULATION"],
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        setSettings(data);
        setValues(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.value])));
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    setStatus("idle");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    setStatus(res.ok ? "saved" : "error");
    if (res.ok && settings) {
      setSettings((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        for (const k of Object.keys(values)) {
          if (next[k]) next[k] = { ...next[k], value: values[k] };
        }
        return next;
      });
    }
    setTimeout(() => setStatus("idle"), 3000);
  }

  function reset(key: string) {
    if (!settings) return;
    setValues((v) => ({ ...v, [key]: settings[key].default }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!settings) return null;

  const isDirty = settings && Object.entries(values).some(([k, v]) => v !== settings[k]?.value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
          <p className="text-sm text-gray-500 mt-1">Ajuste tempos, porcentagens e limites usados em todo o sistema.</p>
        </div>
        <button
          onClick={save}
          disabled={saving || !isDirty}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
            isDirty
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar alterações
        </button>
      </div>

      {/* Status toast */}
      {status !== "idle" && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium",
          status === "saved" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        )}>
          {status === "saved" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {status === "saved" ? "Configurações salvas com sucesso." : "Erro ao salvar. Tente novamente."}
        </div>
      )}

      {/* Groups */}
      {GROUPS.map((group) => (
        <div key={group.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="font-semibold text-gray-800">{group.title}</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {group.keys.map((key) => {
              const meta = settings[key];
              if (!meta) return null;
              const isChanged = values[key] !== meta.default;
              return (
                <div key={key} className="px-6 py-5 flex items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <label htmlFor={key} className="block text-sm font-semibold text-gray-800">
                      {meta.label}
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Padrão: <span className="font-medium">{meta.default} {meta.unit}</span>
                      {" · "}
                      Intervalo: {meta.min}–{meta.max} {meta.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      id={key}
                      type="number"
                      min={meta.min}
                      max={meta.max}
                      value={values[key] ?? meta.value}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: Number(e.target.value) }))}
                      className="w-20 px-3 py-2 text-sm font-semibold text-center border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
                    />
                    <span className="text-xs text-gray-500 font-medium w-12">{meta.unit}</span>
                    <button
                      type="button"
                      onClick={() => reset(key)}
                      disabled={!isChanged}
                      title="Restaurar padrão"
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        isChanged
                          ? "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          : "text-gray-300 cursor-not-allowed"
                      )}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
