import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min ${s}s`;
}

export function getScoreColor(percentage: number) {
  if (percentage >= 75) return "text-green-600";
  if (percentage >= 50) return "text-yellow-600";
  return "text-red-600";
}

export function getScoreBadge(percentage: number) {
  if (percentage >= 65) return { label: "Aprovado", color: "bg-green-100 text-green-800" };
  if (percentage >= 45) return { label: "Regular", color: "bg-yellow-100 text-yellow-800" };
  return { label: "Reprovado", color: "bg-red-100 text-red-800" };
}
