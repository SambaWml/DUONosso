import { prisma } from "@/lib/prisma";

export type SettingKey =
  | "MODULE_PASS_THRESHOLD"
  | "SIMULATION_PASS_THRESHOLD"
  | "SIMULATION_QUESTION_COUNT"
  | "SIMULATION_TIME_LIMIT_MINUTES"
  | "MODULE_QUIZ_QUESTION_COUNT"
  | "MIN_QUESTIONS_FOR_SIMULATION"
  | "ESTIMATED_MODULE_DURATION_MINUTES";

export const SETTING_DEFAULTS: Record<SettingKey, number> = {
  MODULE_PASS_THRESHOLD: 70,
  SIMULATION_PASS_THRESHOLD: 65,
  SIMULATION_QUESTION_COUNT: 40,
  SIMULATION_TIME_LIMIT_MINUTES: 65,
  MODULE_QUIZ_QUESTION_COUNT: 10,
  MIN_QUESTIONS_FOR_SIMULATION: 10,
  ESTIMATED_MODULE_DURATION_MINUTES: 30,
};

export const SETTING_LABELS: Record<SettingKey, { label: string; description: string; unit: string; min: number; max: number }> = {
  MODULE_PASS_THRESHOLD: {
    label: "Aprovação no módulo (%)",
    description: "Percentual mínimo de acertos para concluir um módulo da trilha.",
    unit: "%",
    min: 50,
    max: 100,
  },
  SIMULATION_PASS_THRESHOLD: {
    label: "Aprovação no simulado (%)",
    description: "Percentual mínimo para ser considerado aprovado no simulado (CTFL oficial: 65%).",
    unit: "%",
    min: 50,
    max: 100,
  },
  SIMULATION_QUESTION_COUNT: {
    label: "Questões por simulado",
    description: "Número de questões geradas em cada simulado completo.",
    unit: "questões",
    min: 10,
    max: 80,
  },
  SIMULATION_TIME_LIMIT_MINUTES: {
    label: "Tempo limite do simulado (min)",
    description: "Tempo total disponível para completar um simulado.",
    unit: "min",
    min: 30,
    max: 180,
  },
  MODULE_QUIZ_QUESTION_COUNT: {
    label: "Questões por quiz de módulo",
    description: "Número de questões apresentadas em cada quiz de módulo da trilha.",
    unit: "questões",
    min: 3,
    max: 30,
  },
  MIN_QUESTIONS_FOR_SIMULATION: {
    label: "Mínimo de questões para simulado",
    description: "Quantidade mínima de questões no banco para habilitar a geração de simulados.",
    unit: "questões",
    min: 5,
    max: 50,
  },
  ESTIMATED_MODULE_DURATION_MINUTES: {
    label: "Duração estimada por módulo (min)",
    description: "Tempo médio estimado para completar cada módulo (usado no cálculo de horas restantes).",
    unit: "min",
    min: 5,
    max: 120,
  },
};

let cache: Record<string, number> | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 60_000;

export async function getSettings(): Promise<Record<SettingKey, number>> {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) {
    return cache as Record<SettingKey, number>;
  }

  const rows = await prisma.systemConfig.findMany();
  const result = { ...SETTING_DEFAULTS } as Record<SettingKey, number>;
  for (const row of rows) {
    if (row.key in result) {
      const v = parseInt(row.value, 10);
      if (!isNaN(v)) result[row.key as SettingKey] = v;
    }
  }

  cache = result;
  cacheAt = Date.now();
  return result;
}

export function invalidateSettingsCache() {
  cache = null;
}
