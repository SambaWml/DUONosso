import { prisma } from "@/lib/prisma";

type LogLevel = "INFO" | "WARN" | "ERROR" | "FATAL";

interface LogOptions {
  level?: LogLevel;
  route?: string;
  method?: string;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
}

export async function log(message: string, error?: unknown, options: LogOptions = {}) {
  const level = options.level ?? (error ? "ERROR" : "INFO");

  let stack: string | undefined;
  if (error instanceof Error) {
    stack = error.stack;
    if (!message) message = error.message;
  } else if (typeof error === "string") {
    stack = error;
  }

  try {
    await prisma.systemLog.create({
      data: {
        level,
        message,
        stack,
        route: options.route,
        method: options.method,
        userId: options.userId,
        userEmail: options.userEmail,
        metadata: options.metadata as object | undefined,
      },
    });
  } catch {
    // Never throw from logger
    console.error("[Logger] Failed to persist log:", message);
  }

  // Also mirror to console
  const prefix = `[${level}]${options.route ? ` ${options.method ?? "?"} ${options.route}` : ""}`;
  if (level === "ERROR" || level === "FATAL") {
    console.error(prefix, message, error ?? "");
  } else if (level === "WARN") {
    console.warn(prefix, message);
  } else {
    console.log(prefix, message);
  }
}

export const logger = {
  info: (message: string, options?: LogOptions) =>
    log(message, undefined, { ...options, level: "INFO" }),
  warn: (message: string, options?: LogOptions) =>
    log(message, undefined, { ...options, level: "WARN" }),
  error: (message: string, error?: unknown, options?: LogOptions) =>
    log(message, error, { ...options, level: "ERROR" }),
  fatal: (message: string, error?: unknown, options?: LogOptions) =>
    log(message, error, { ...options, level: "FATAL" }),
};
