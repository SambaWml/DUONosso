"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BookOpen,
  Brain,
  Target,
  TrendingUp,
  PlayCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
  Flame,
} from "lucide-react";
import { cn, formatDate, getScoreBadge } from "@/lib/utils";
import type { DashboardStats } from "@/types";

interface TrackProgress {
  id: string;
  title: string;
  done: number;
  total: number;
  currentModule: string | null;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [track, setTrack] = useState<TrackProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/learning-paths").then((r) => r.json()),
    ]).then(([dash, paths]) => {
      setStats(dash);
      const list: Array<{ id: string; title: string; modules: Array<{ id: string; title: string; status: string }> }> =
        Array.isArray(paths) ? paths : [];
      const p = list.find((x) => x.title === "Trilha CTFL") ?? list[0] ?? null;
      if (p) {
        const done = p.modules.filter((m) => m.status === "COMPLETED").length;
        const current = p.modules.find((m) => m.status === "UNLOCKED");
        setTrack({ id: p.id, title: p.title, done, total: p.modules.length, currentModule: current?.title ?? null });
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const chartData = stats?.recentSimulations
    .slice()
    .reverse()
    .map((s, i) => ({
      name: `#${i + 1}`,
      score: Math.round(s.percentage),
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Veja seu progresso nos estudos para o CTFL.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<PlayCircle className="w-5 h-5 text-indigo-600" />}
          label="Simulados"
          value={stats?.totalSimulations ?? 0}
          bg="bg-indigo-50"
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-green-600" />}
          label="Média Geral"
          value={`${stats?.averageScore ?? 0}%`}
          bg="bg-green-50"
        />
        <StatCard
          icon={<Brain className="w-5 h-5 text-purple-600" />}
          label="Questões"
          value={stats?.totalQuestions ?? 0}
          bg="bg-purple-50"
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-orange-600" />}
          label="Materiais"
          value={stats?.totalMaterials ?? 0}
          bg="bg-orange-50"
        />
      </div>

      {/* Track progress or prompt to start */}
      {!track && !loading && stats && stats.totalMaterials > 0 && (
        <Link href="/simulation" className="block bg-indigo-50 border border-indigo-200 rounded-2xl p-5 hover:bg-indigo-100 transition-all">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-indigo-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-indigo-900 text-sm">Faça o simulado diagnóstico para criar sua trilha</p>
              <p className="text-xs text-indigo-600 mt-0.5">40 questões · a IA monta sua trilha personalizada automaticamente</p>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-400 ml-auto flex-shrink-0" />
          </div>
        </Link>
      )}
      {track && (
        <Link href={`/trilha/${track.id}`} className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Trilha de Estudos</p>
                {track.currentModule && (
                  <p className="text-xs text-indigo-600 truncate max-w-[220px]">Agora: {track.currentModule}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xl font-bold text-indigo-600">
                {track.total > 0 ? Math.round((track.done / track.total) * 100) : 0}%
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${track.total > 0 ? (track.done / track.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{track.done}/{track.total} módulos concluídos</p>
        </Link>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Últimos Simulados</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v) => [`${v}%`, "Score"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={<PlayCircle className="w-8 h-8 text-gray-300" />}
              text="Nenhum simulado realizado ainda."
              link="/simulation"
              linkText="Iniciar simulado"
            />
          )}
        </div>

        {/* Weak areas */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pontos Fracos</h2>
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          {stats?.weakChapters && stats.weakChapters.length > 0 ? (
            <div className="space-y-3">
              {stats.weakChapters.map((c) => {
                const pct = c.totalAnswered > 0 ? Math.round((c.errorCount / c.totalAnswered) * 100) : 0;
                return (
                  <div key={c.chapterId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 truncate max-w-[180px]">{c.chapterTitle}</span>
                      <span className="text-xs font-medium text-red-600">{pct}% erros</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<AlertCircle className="w-8 h-8 text-gray-300" />}
              text="Realize simulados para identificar seus pontos fracos."
              link="/simulation"
              linkText="Iniciar simulado"
            />
          )}
        </div>
      </div>

      {/* Recent Simulations */}
      {stats?.recentSimulations && stats.recentSimulations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Histórico Recente</h2>
            <Link href="/history" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentSimulations.map((s) => {
              const badge = getScoreBadge(s.percentage);
              return (
                <Link
                  key={s.id}
                  href={`/results/${s.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {s.score}/{s.totalQuestions} acertos
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-sm font-bold", s.percentage >= 65 ? "text-green-600" : s.percentage >= 45 ? "text-yellow-600" : "text-red-600")}>
                      {Math.round(s.percentage)}%
                    </span>
                    <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", badge.color)}>
                      {badge.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { href: "/upload", label: "Enviar PDF", color: "bg-indigo-600" },
          { href: "/simulation", label: "Novo Simulado", color: "bg-green-600" },
          { href: "/study-plan", label: "Plano de Estudos", color: "bg-orange-600" },
        ].map(({ href, label, color }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium text-center transition hover:opacity-90",
              color
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", bg)}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function EmptyState({ icon, text, link, linkText }: { icon: React.ReactNode; text: string; link: string; linkText: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3">{icon}</div>
      <p className="text-sm text-gray-500 mb-3">{text}</p>
      <Link href={link} className="text-sm text-indigo-600 font-medium hover:underline">
        {linkText}
      </Link>
    </div>
  );
}
