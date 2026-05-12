import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { logger } from "@/lib/logger";
import { rebuildUnifiedTrack } from "@/lib/unified-track";
import { ensureQuestionsForUser } from "@/lib/generate-questions";
import { getSettings } from "@/lib/settings";

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// CTFL 4.0 official distribution — exact counts for 40 questions
// Cap 1: 26% = 10q | Cap 2: 17% = 7q | Cap 3: 11% = 4q
// Cap 4: 25% = 10q | Cap 5: 14% = 6q | Cap 6:  7% = 3q  → total 40
const CTFL_COUNTS: Record<number, number> = { 1: 10, 2: 7, 3: 4, 4: 10, 5: 6, 6: 3 };

/** Maps a question to its real CTFL chapter (1–6).
 *  Priority: syllabusRef "FL-X..." → chapter title "1 Fundamentos..." → orderIndex fallback */
function ctflChapter(syllabusRef: string | null, chapterTitle: string, orderIndex: number): number {
  if (syllabusRef && syllabusRef !== "N/A") {
    const m = syllabusRef.match(/FL-?(\d)/i);
    if (m) {
      const n = parseInt(m[1]);
      if (n >= 1 && n <= 6) return n;
    }
  }
  const t = chapterTitle.match(/^(?:cap[íi]tulo\s+|chapter\s+)?([1-6])[\s\-–]/i);
  if (t) return parseInt(t[1]);
  return Math.min(Math.max(orderIndex + 1, 1), 6);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const simulationId = searchParams.get("id");

  if (simulationId) {
    const simulation = await prisma.simulation.findFirst({
      where: { id: simulationId, userId: session.user.id },
      include: {
        answers: {
          include: {
            question: {
              include: { chapter: { select: { id: true, title: true } } },
            },
            adminQuestion: {
              include: { adminModule: { select: { id: true, title: true } } },
            },
          },
        },
      },
    });
    if (!simulation) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    return NextResponse.json(simulation);
  }

  const simulations = await prisma.simulation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { answers: true } } },
  });

  return NextResponse.json(simulations);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const { answers, timeSpentSec } = await request.json() as {
    answers: { questionId: string; source?: "admin" | "ai"; selectedAnswer: string }[];
    timeSpentSec: number;
  };

  if (!answers || answers.length === 0) {
    return NextResponse.json({ error: "Respostas obrigatórias." }, { status: 400 });
  }

  // Deduplicate: keep last answer per questionId
  const deduped = Object.values(
    Object.fromEntries(answers.map((a) => [a.questionId, a]))
  ) as { questionId: string; source?: "admin" | "ai"; selectedAnswer: string }[];

  const adminIds = deduped.filter((a) => a.source === "admin").map((a) => a.questionId);
  const aiIds = deduped.filter((a) => a.source !== "admin").map((a) => a.questionId);

  const [adminQs, aiQs] = await Promise.all([
    adminIds.length > 0
      ? prisma.adminQuestion.findMany({ where: { id: { in: adminIds } }, select: { id: true, correctAnswer: true } })
      : [],
    aiIds.length > 0
      ? prisma.question.findMany({ where: { id: { in: aiIds }, chapter: { material: { userId } } }, select: { id: true, correctAnswer: true } })
      : [],
  ]);

  const correctMap = Object.fromEntries([...adminQs, ...aiQs].map((q) => [q.id, q.correctAnswer]));

  let score = 0;
  const processedAnswers = deduped.map((a) => {
    const isCorrect = correctMap[a.questionId] === a.selectedAnswer;
    if (isCorrect) score++;
    return a.source === "admin"
      ? { adminQuestionId: a.questionId, selectedAnswer: a.selectedAnswer, isCorrect }
      : { questionId: a.questionId, selectedAnswer: a.selectedAnswer, isCorrect };
  });

  const total = deduped.length;
  const percentage = (score / total) * 100;

  const simulation = await prisma.simulation.create({
    data: {
      userId,
      score,
      totalQuestions: total,
      percentage,
      timeSpentSec: timeSpentSec || 0,
      status: "COMPLETED",
      answers: { create: processedAnswers },
    },
  });

  // Auto-create/update study plan + learning paths after every simulation
  const simulationCount = await prisma.simulation.count({ where: { userId } });
  let pathsCreated = 0;
  let studyPlanCreated = false;

  try {
    if (simulationCount === 1) {
      // First simulation: generate full AI study plan + build track
      const result = await autoCreateStudyPlanAndPaths(userId);
      pathsCreated = result.pathsCreated;
      studyPlanCreated = result.studyPlanCreated;
    } else {
      // Subsequent simulations: update weak areas + rebuild track ordering (no AI cost)
      const result = await updateWeakAreasAndRebuildTrack(userId);
      pathsCreated = result.pathsCreated;
    }
  } catch (err) {
    await logger.error("Falha ao atualizar plano/trilha após simulado", err, {
      route: "/api/simulations",
      method: "POST",
      userId,
    });
  }

  return NextResponse.json({ simulationId: simulation.id, score, total, percentage, pathsCreated, studyPlanCreated });
}

/** Recomputes weak areas from all simulation history and rebuilds track ordering.
 *  No AI call — safe to run after every simulation. */
async function updateWeakAreasAndRebuildTrack(userId: string): Promise<{ pathsCreated: number }> {
  const allAnswers = await prisma.simulationAnswer.findMany({
    where: { simulation: { userId } },
    include: {
      question: { include: { chapter: { select: { id: true, title: true } } } },
      adminQuestion: { include: { adminModule: { select: { id: true, title: true } } } },
    },
  });

  const chapterMap: Record<string, { title: string; errors: number; total: number }> = {};
  for (const a of allAnswers) {
    let key: string | undefined;
    let title: string | undefined;
    if (a.adminQuestionId && a.adminQuestion?.adminModule) {
      key = a.adminQuestion.adminModule.id;
      title = a.adminQuestion.adminModule.title;
    } else if (a.questionId && a.question) {
      key = a.question.chapterId ?? undefined;
      title = a.question.chapter?.title ?? undefined;
    }
    if (!key || !title) continue;
    if (!chapterMap[key]) chapterMap[key] = { title, errors: 0, total: 0 };
    chapterMap[key].total++;
    if (!a.isCorrect) chapterMap[key].errors++;
  }

  const weakAreas = Object.entries(chapterMap)
    .map(([, v]) => ({ title: v.title, errorRate: v.total > 0 ? (v.errors / v.total) * 100 : 0 }))
    .filter((c) => c.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 8)
    .map((c) => c.title);

  // Update weak areas on existing plan (no content regeneration)
  await prisma.studyPlan.updateMany({
    where: { userId },
    data: { weakAreas },
  });

  const { created, modulesAdded } = await rebuildUnifiedTrack(userId);
  return { pathsCreated: (created || modulesAdded > 0) ? 1 : 0 };
}

async function autoCreateStudyPlanAndPaths(userId: string): Promise<{ pathsCreated: number; studyPlanCreated: boolean }> {
  const allAnswers = await prisma.simulationAnswer.findMany({
    where: { simulation: { userId } },
    include: {
      question: { include: { chapter: { select: { id: true, title: true } } } },
      adminQuestion: { include: { adminModule: { select: { id: true, title: true } } } },
    },
  });

  const chapterMap: Record<string, { title: string; errors: number; total: number }> = {};
  for (const a of allAnswers) {
    let key: string | undefined;
    let title: string | undefined;

    if (a.adminQuestionId && a.adminQuestion?.adminModule) {
      key = a.adminQuestion.adminModule.id;
      title = a.adminQuestion.adminModule.title;
    } else if (a.questionId && a.question) {
      key = a.question.chapterId ?? undefined;
      title = a.question.chapter?.title ?? undefined;
    }

    if (!key || !title) continue;
    if (!chapterMap[key]) chapterMap[key] = { title, errors: 0, total: 0 };
    chapterMap[key].total++;
    if (!a.isCorrect) chapterMap[key].errors++;
  }

  const weakAreas = Object.entries(chapterMap)
    .map(([id, v]) => ({ id, title: v.title, errorRate: v.total > 0 ? (v.errors / v.total) * 100 : 0 }))
    .filter((c) => c.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 8);

  const recentSimulations = await prisma.simulation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { percentage: true, score: true, totalQuestions: true, createdAt: true },
  });

  const avgScore = recentSimulations.reduce((s: number, sim: { percentage: number }) => s + sim.percentage, 0) / recentSimulations.length;

  const prompt = `Você é um coach de estudos especialista em certificação ISTQB CTFL.

Com base nos dados de desempenho abaixo, crie um plano de estudos personalizado em Markdown.

DADOS DE DESEMPENHO:
- Média nos últimos simulados: ${Math.round(avgScore)}%
- Total de simulados realizados: ${recentSimulations.length}
- Meta de aprovação: 65% (26/40 questões — padrão oficial CTFL)

ÁREAS COM MAIOR DIFICULDADE:
${weakAreas.length > 0 ? weakAreas.map((c) => `- ${c.title}: ${Math.round(c.errorRate)}% de erro`).join("\n") : "- Nenhuma área crítica identificada ainda"}

CRIE UM PLANO que inclua:
1. Análise do desempenho atual (2-3 frases)
2. Priorização dos capítulos por urgência (com base nas áreas fracas)
3. Cronograma semanal sugerido (tabela markdown)
4. Técnicas de estudo específicas para cada área fraca
5. Metas de progresso semanais
6. Dicas práticas para a prova CTFL

Formato: Markdown estruturado, objetivo e motivador. Use emojis. Idioma: Português brasileiro.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion.choices[0].message.content ?? "";

  await prisma.studyPlan.create({
    data: { userId, content, weakAreas: weakAreas.map((c) => c.title) },
  });

  // Build / update the single unified CTFL track
  const { created, modulesAdded } = await rebuildUnifiedTrack(userId);
  const pathsCreated = (created || modulesAdded > 0) ? 1 : 0;

  return { pathsCreated, studyPlanCreated: true };
}

// GET random N questions for simulation — prefers AdminQuestion bank, falls back to AI
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSettings();
  const bodyCount = await request.json().catch(() => ({})) as { count?: number };
  const count = bodyCount.count ?? settings.SIMULATION_QUESTION_COUNT;

  // ── Admin question bank (preferred) ────────────────────────────────────────
  const adminQuestions = await prisma.adminQuestion.findMany({
    where: { isActive: true },
    select: {
      id: true, statement: true, imageUrl: true,
      alternativeA: true, alternativeB: true, alternativeC: true, alternativeD: true,
      difficulty: true, syllabusRef: true,
      adminModule: { select: { id: true, title: true, ctflChapter: true } },
    },
  });

  if (adminQuestions.length >= settings.MIN_QUESTIONS_FOR_SIMULATION) {
    const byCtfl = new Map<number, typeof adminQuestions>();
    for (let i = 1; i <= 6; i++) byCtfl.set(i, []);
    for (const q of adminQuestions) byCtfl.get(q.adminModule.ctflChapter)!.push(q);

    const selected: typeof adminQuestions = [];
    for (let c = 1; c <= 6; c++) {
      const pool = [...(byCtfl.get(c) ?? [])].sort(() => Math.random() - 0.5);
      selected.push(...pool.slice(0, Math.min(CTFL_COUNTS[c] ?? 0, pool.length)));
    }
    if (selected.length < count) {
      const usedIds = new Set(selected.map((q) => q.id));
      selected.push(...adminQuestions.filter((q) => !usedIds.has(q.id)).sort(() => Math.random() - 0.5).slice(0, count - selected.length));
    }

    return NextResponse.json(
      selected.sort(() => Math.random() - 0.5).slice(0, count).map((q) => ({
        id: q.id,
        source: "admin" as const,
        statement: q.statement,
        imageUrl: q.imageUrl,
        alternativeA: q.alternativeA,
        alternativeB: q.alternativeB,
        alternativeC: q.alternativeC,
        alternativeD: q.alternativeD,
        difficulty: q.difficulty,
        syllabusRef: q.syllabusRef,
        chapterId: q.adminModule.id,
        chapterTitle: q.adminModule.title,
      }))
    );
  }

  // ── Fallback: AI-generated questions ───────────────────────────────────────
  await ensureQuestionsForUser(session.user.id);

  const allQuestions = await prisma.question.findMany({
    where: { chapter: { material: { userId: session.user.id } } },
    select: {
      id: true, statement: true,
      alternativeA: true, alternativeB: true, alternativeC: true, alternativeD: true,
      difficulty: true, syllabusRef: true, chapterId: true,
      chapter: { select: { id: true, title: true, orderIndex: true } },
    },
  });

  if (allQuestions.length < settings.MIN_QUESTIONS_FOR_SIMULATION) {
    return NextResponse.json(
      { error: `Banco de questões insuficiente (${allQuestions.length} disponíveis). O administrador precisa adicionar mais questões para iniciar o simulado.` },
      { status: 400 }
    );
  }

  const byCtfl = new Map<number, typeof allQuestions>();
  for (let i = 1; i <= 6; i++) byCtfl.set(i, []);
  for (const q of allQuestions) {
    byCtfl.get(ctflChapter(q.syllabusRef, q.chapter.title, q.chapter.orderIndex))!.push(q);
  }

  const selected: typeof allQuestions = [];
  for (let c = 1; c <= 6; c++) {
    const pool = [...(byCtfl.get(c) ?? [])].sort(() => Math.random() - 0.5);
    selected.push(...pool.slice(0, Math.min(CTFL_COUNTS[c] ?? 0, pool.length)));
  }
  if (selected.length < count) {
    const usedIds = new Set(selected.map((q) => q.id));
    selected.push(...allQuestions.filter((q) => !usedIds.has(q.id)).sort(() => Math.random() - 0.5).slice(0, count - selected.length));
  }

  return NextResponse.json(
    selected.sort(() => Math.random() - 0.5).slice(0, count).map((q) => ({
      id: q.id,
      source: "ai" as const,
      statement: q.statement,
      imageUrl: null,
      alternativeA: q.alternativeA,
      alternativeB: q.alternativeB,
      alternativeC: q.alternativeC,
      alternativeD: q.alternativeD,
      difficulty: q.difficulty,
      syllabusRef: q.syllabusRef,
      chapterId: q.chapterId,
      chapterTitle: q.chapter.title,
    }))
  );
}
