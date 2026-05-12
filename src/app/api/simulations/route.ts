import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { logger } from "@/lib/logger";
import { rebuildUnifiedTrack } from "@/lib/unified-track";
import { ensureQuestionsForUser } from "@/lib/generate-questions";

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const openai = (() => { try { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); } catch { return null as unknown as OpenAI; } })();

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
    answers: { questionId: string; selectedAnswer: string }[];
    timeSpentSec: number;
  };

  if (!answers || answers.length === 0) {
    return NextResponse.json({ error: "Respostas obrigatórias." }, { status: 400 });
  }

  // Deduplicate: keep last answer per questionId to prevent score inflation
  const deduped = Object.values(
    Object.fromEntries(answers.map((a) => [a.questionId, a]))
  ) as { questionId: string; selectedAnswer: string }[];

  const questionIds = deduped.map((a) => a.questionId);
  const questions = await prisma.question.findMany({
    where: {
      id: { in: questionIds },
      chapter: { material: { userId } },
    },
    select: { id: true, correctAnswer: true },
  });

  const correctMap = Object.fromEntries(questions.map((q: { id: string; correctAnswer: string }) => [q.id, q.correctAnswer]));

  let score = 0;
  const processedAnswers = deduped.map((a) => {
    const isCorrect = correctMap[a.questionId] === a.selectedAnswer;
    if (isCorrect) score++;
    return { questionId: a.questionId, selectedAnswer: a.selectedAnswer, isCorrect };
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

  // Auto-create study plan + learning paths after the first simulation
  const simulationCount = await prisma.simulation.count({ where: { userId } });
  let pathsCreated = 0;
  let studyPlanCreated = false;

  if (simulationCount === 1) {
    try {
      const result = await autoCreateStudyPlanAndPaths(userId);
      pathsCreated = result.pathsCreated;
      studyPlanCreated = result.studyPlanCreated;
    } catch (err) {
      await logger.error("Falha ao auto-criar plano de estudos após simulado", err, {
        route: "/api/simulations",
        method: "POST",
        userId,
      });
    }
  }

  return NextResponse.json({ simulationId: simulation.id, score, total, percentage, pathsCreated, studyPlanCreated });
}

async function autoCreateStudyPlanAndPaths(userId: string): Promise<{ pathsCreated: number; studyPlanCreated: boolean }> {
  const wrongAnswers = await prisma.simulationAnswer.findMany({
    where: { isCorrect: false, simulation: { userId } },
    include: { question: { include: { chapter: { select: { id: true, title: true } } } } },
  });

  const allAnswers = await prisma.simulationAnswer.findMany({
    where: { simulation: { userId } },
    include: { question: { select: { chapterId: true } } },
  });

  const chapterMap: Record<string, { title: string; errors: number; total: number }> = {};
  for (const a of allAnswers) {
    const cid = a.question.chapterId;
    if (!chapterMap[cid]) chapterMap[cid] = { title: "", errors: 0, total: 0 };
    chapterMap[cid].total++;
  }
  for (const a of wrongAnswers) {
    const cid = a.question.chapterId;
    if (!chapterMap[cid]) chapterMap[cid] = { title: a.question.chapter.title, errors: 0, total: 0 };
    chapterMap[cid].title = a.question.chapter.title;
    chapterMap[cid].errors++;
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

// GET random 40 questions for simulation — respects CTFL chapter distribution
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count = 40 } = await request.json().catch(() => ({}));

  // Generate questions for any chapter that doesn't have them yet (lazy, first-use)
  await ensureQuestionsForUser(session.user.id);

  const allQuestions = await prisma.question.findMany({
    where: { chapter: { material: { userId: session.user.id } } },
    select: {
      id: true,
      statement: true,
      alternativeA: true,
      alternativeB: true,
      alternativeC: true,
      alternativeD: true,
      difficulty: true,
      syllabusRef: true,
      chapterId: true,
      chapter: { select: { id: true, title: true, orderIndex: true } },
    },
  });

  if (allQuestions.length < 10) {
    return NextResponse.json(
      { error: `Questões insuficientes. Você tem ${allQuestions.length} questões. Processe um material antes de iniciar.` },
      { status: 400 }
    );
  }

  // Group by real CTFL chapter (1–6) using syllabusRef / title / orderIndex
  const byCtfl = new Map<number, typeof allQuestions>();
  for (let i = 1; i <= 6; i++) byCtfl.set(i, []);
  for (const q of allQuestions) {
    const c = ctflChapter(q.syllabusRef, q.chapter.title, q.chapter.orderIndex);
    byCtfl.get(c)!.push(q);
  }

  const selected: typeof allQuestions = [];

  for (let c = 1; c <= 6; c++) {
    const pool = [...(byCtfl.get(c) ?? [])].sort(() => Math.random() - 0.5);
    const target = CTFL_COUNTS[c] ?? 0;
    selected.push(...pool.slice(0, Math.min(target, pool.length)));
  }

  // Fill remaining slots when a chapter has fewer questions than needed
  if (selected.length < count) {
    const usedIds = new Set(selected.map((q) => q.id));
    const remaining = allQuestions.filter((q) => !usedIds.has(q.id)).sort(() => Math.random() - 0.5);
    selected.push(...remaining.slice(0, count - selected.length));
  }

  // Final shuffle
  const shuffled = selected.sort(() => Math.random() - 0.5).slice(0, count);

  return NextResponse.json(
    shuffled.map((q) => ({
      id: q.id,
      statement: q.statement,
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
