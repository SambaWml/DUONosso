"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, HelpCircle, Users, TrendingDown, BarChart3, Loader2, Plus, Upload, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminStats {
  questionStats: { id: string; statement: string; moduleName: string; total: number; errorRate: number }[];
  moduleStats: { id: string; title: string; ctflChapter: number; questionCount: number; completedByUsers: number; totalUsers: number; completionRate: number }[];
  totalUsers: number;
  activeUsers: number;
  totalModules: number;
  totalQuestions: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((s) => { setStats(s); setLoadingStats(false); })
      .catch(() => setLoadingStats(false));
  }, []);

  const tiles = [
    {
      label: "Módulos",
      value: stats?.totalModules ?? "—",
      sub: "capítulos CTFL",
      href: "/admin/modules",
      icon: BookOpen,
      accent: "from-indigo-500 to-indigo-600",
      text: "text-indigo-600",
    },
    {
      label: "Questões",
      value: stats?.totalQuestions ?? "—",
      sub: "no banco",
      href: "/admin/questions",
      icon: HelpCircle,
      accent: "from-emerald-500 to-emerald-600",
      text: "text-emerald-600",
    },
    {
      label: "Usuários",
      value: stats?.totalUsers ?? "—",
      sub: "cadastrados",
      href: "/admin/users",
      icon: Users,
      accent: "from-indigo-500 to-indigo-600",
      text: "text-indigo-600",
    },
    {
      label: "Ativos",
      value: stats?.activeUsers ?? "—",
      sub: "últimos 30 dias",
      href: "/admin/users",
      icon: BarChart3,
      accent: "from-orange-400 to-orange-500",
      text: "text-orange-500",
    },
  ];

  const actions = [
    {
      label: "Novo módulo",
      description: "Criar capítulo de estudo",
      href: "/admin/modules/new",
      icon: BookOpen,
      color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
      iconColor: "bg-indigo-600",
    },
    {
      label: "Nova questão",
      description: "Adicionar ao banco",
      href: "/admin/questions/new",
      icon: Plus,
      color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
      iconColor: "bg-emerald-600",
    },
    {
      label: "Importar questões",
      description: "Via CSV ou JSON",
      href: "/admin/questions/import",
      icon: Upload,
      color: "bg-gray-50 text-gray-700 hover:bg-gray-100",
      iconColor: "bg-gray-700",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-black text-[#1A1B2E]">Visão Geral</h1>
        <p className="text-sm text-gray-400 mt-0.5">Monitoramento da plataforma em tempo real</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {tiles.map(({ label, value, sub, href, icon: Icon, accent, text }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] p-5 hover:brightness-98 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0", accent)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity", text)} />
            </div>
            <p className="text-3xl font-black text-[#1A1B2E] leading-none">{value}</p>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">{label}</p>
            <p className="text-[11px] text-gray-300 mt-0.5">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Ações rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {actions.map(({ label, description, href, icon: Icon, color, iconColor }) => (
            <Link
              key={href}
              href={href}
              className={cn("flex items-center gap-4 p-4 rounded-2xl border border-transparent transition-all group", color)}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", iconColor)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{label}</p>
                <p className="text-xs opacity-60 mt-0.5">{description}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-60 flex-shrink-0 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>

      {/* Analytics */}
      {loadingStats ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : stats && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top missed questions */}
          <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-[#1A1B2E]">Questões mais erradas</h2>
                <p className="text-xs text-gray-400">Por taxa de erro nos simulados</p>
              </div>
            </div>
            <div className="p-4">
              {stats.questionStats.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400">Nenhum simulado realizado ainda.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.questionStats.map((q, i) => (
                    <Link key={q.id} href={`/admin/questions/${q.id}`}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
                    >
                      <span className="text-xs text-gray-300 font-mono w-4 flex-shrink-0 pt-0.5 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-400 mb-0.5 font-medium truncate">{q.moduleName}</p>
                        <p className="text-sm text-gray-700 line-clamp-1 group-hover:text-gray-900 transition-colors">{q.statement}</p>
                        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all",
                              q.errorRate >= 70 ? "bg-red-500" : q.errorRate >= 50 ? "bg-orange-400" : "bg-yellow-400"
                            )}
                            style={{ width: `${q.errorRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right pt-0.5">
                        <span className={cn("text-sm font-bold tabular-nums",
                          q.errorRate >= 70 ? "text-red-600" : q.errorRate >= 50 ? "text-orange-500" : "text-yellow-600"
                        )}>
                          {q.errorRate}%
                        </span>
                        <p className="text-[10px] text-gray-300 mt-0.5">{q.total} resp.</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Module completion rates */}
          <div className="bg-white rounded-2xl border-2 border-[#E9E4F2] shadow-[0_2px_0_#D8D2E5] overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-[#1A1B2E]">Conclusão por módulo</h2>
                <p className="text-xs text-gray-400">% de usuários que completaram</p>
              </div>
            </div>
            <div className="p-4">
              {stats.moduleStats.every((m) => m.totalUsers === 0) ? (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400">Nenhum usuário com trilha ativa ainda.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {stats.moduleStats.map((m) => (
                    <Link key={m.id} href={`/admin/modules/${m.id}`}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
                    >
                      <div className="w-5 h-5 rounded bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-indigo-700">{m.ctflChapter}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate group-hover:text-gray-900 transition-colors">{m.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{m.questionCount} questões</p>
                        {m.totalUsers > 0 && (
                          <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all",
                                m.completionRate >= 70 ? "bg-green-500" : m.completionRate >= 40 ? "bg-yellow-400" : "bg-gray-300"
                              )}
                              style={{ width: `${m.completionRate}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right pt-0.5">
                        <span className={cn("text-sm font-bold tabular-nums",
                          m.completionRate >= 70 ? "text-green-600" : m.completionRate >= 40 ? "text-yellow-600" : "text-gray-400"
                        )}>
                          {m.totalUsers > 0 ? `${m.completionRate}%` : "—"}
                        </span>
                        {m.totalUsers > 0 && (
                          <p className="text-[10px] text-gray-300 mt-0.5">{m.completedByUsers}/{m.totalUsers}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
