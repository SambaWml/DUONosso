"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertCircle, AlertTriangle, Info, Zap, Trash2, RefreshCw,
  Search, ChevronDown, ChevronUp, Loader2, ShieldAlert, X,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type LogLevel = "ALL" | "INFO" | "WARN" | "ERROR" | "FATAL";

interface SystemLog {
  id: string;
  level: Exclude<LogLevel, "ALL">;
  message: string;
  stack: string | null;
  route: string | null;
  method: string | null;
  userId: string | null;
  userEmail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Summary { level: string; _count: { id: number } }

const LEVEL_CONFIG = {
  INFO:  { icon: Info,          color: "text-blue-600",  bg: "bg-blue-50 border-blue-200",   badge: "bg-blue-100 text-blue-800" },
  WARN:  { icon: AlertTriangle, color: "text-yellow-600",bg: "bg-yellow-50 border-yellow-200",badge: "bg-yellow-100 text-yellow-800" },
  ERROR: { icon: AlertCircle,   color: "text-red-600",   bg: "bg-red-50 border-red-200",     badge: "bg-red-100 text-red-800" },
  FATAL: { icon: Zap,           color: "text-purple-600",bg: "bg-purple-50 border-purple-200",badge:"bg-purple-100 text-purple-800" },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<LogLevel>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      ...(level !== "ALL" ? { level } : {}),
      ...(search ? { search } : {}),
    });
    const res = await fetch(`/api/logs?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setSummary(data.summary ?? []);
    setLoading(false);
  }, [level, search, page]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/logs?id=${id}`, { method: "DELETE" });
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setDeletingId(null);
  }

  async function handleClearAll() {
    if (!confirm("Apagar TODOS os logs? Esta ação não pode ser desfeita.")) return;
    setClearing(true);
    await fetch("/api/logs?clearAll=true", { method: "DELETE" });
    setLogs([]);
    setTotal(0);
    setSummary([]);
    setClearing(false);
  }

  const countByLevel = (lvl: string) =>
    summary.find((s) => s.level === lvl)?._count.id ?? 0;

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs do Sistema</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitoramento de erros e eventos em tempo real.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Atualizar
          </button>
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 transition"
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Limpar tudo
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["FATAL", "ERROR", "WARN", "INFO"] as const).map((lvl) => {
          const cfg = LEVEL_CONFIG[lvl];
          const Icon = cfg.icon;
          const count = countByLevel(lvl);
          return (
            <button
              key={lvl}
              onClick={() => { setLevel(lvl === level ? "ALL" : lvl); setPage(1); }}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl border text-left transition",
                level === lvl ? cfg.bg : "bg-white border-gray-200 hover:bg-gray-50"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", cfg.color)} />
              <div>
                <p className="text-xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">{lvl}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por mensagem, rota, email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <select
          value={level}
          onChange={(e) => { setLevel(e.target.value as LogLevel); setPage(1); }}
          className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="ALL">Todos os níveis</option>
          <option value="FATAL">FATAL</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
        </select>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldAlert className="w-12 h-12 text-gray-300 mb-3" />
            <p className="font-medium text-gray-500">Nenhum log encontrado</p>
            <p className="text-sm text-gray-400 mt-1">O sistema está sem erros registrados.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const cfg = LEVEL_CONFIG[log.level];
              const Icon = cfg.icon;
              const isOpen = expanded === log.id;

              return (
                <div key={log.id} className="group">
                  <button
                    className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-gray-50 transition"
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                  >
                    <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", cfg.color)} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold", cfg.badge)}>
                          {log.level}
                        </span>
                        {log.route && (
                          <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                            {log.method && `${log.method} `}{log.route}
                          </code>
                        )}
                        {log.userEmail && (
                          <span className="text-xs text-gray-400">{log.userEmail}</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 truncate">{log.message}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                      >
                        {deletingId === log.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 space-y-3">
                      {/* Full message */}
                      <div className={cn("rounded-xl border p-4", cfg.bg)}>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Mensagem</p>
                        <p className="text-sm text-gray-800 break-words">{log.message}</p>
                      </div>

                      {/* Stack trace */}
                      {log.stack && (
                        <div className="rounded-xl border border-gray-200 bg-gray-950 p-4 overflow-x-auto">
                          <p className="text-xs font-semibold text-gray-400 mb-2">Stack Trace</p>
                          <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono leading-5">
                            {log.stack}
                          </pre>
                        </div>
                      )}

                      {/* Metadata */}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Metadados</p>
                          <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Details grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {[
                          { label: "ID", value: log.id },
                          { label: "Rota", value: log.route ?? "—" },
                          { label: "Usuário", value: log.userEmail ?? log.userId ?? "—" },
                          { label: "Data", value: new Date(log.createdAt).toLocaleString("pt-BR") },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-gray-400 mb-0.5">{label}</p>
                            <p className="font-medium text-gray-700 truncate">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} de {total} registros
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 disabled:opacity-40 hover:bg-white transition"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 disabled:opacity-40 hover:bg-white transition"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Atualização automática a cada 15 segundos.
      </p>
    </div>
  );
}
