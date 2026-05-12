import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { logger } from "@/lib/logger";
import { rebuildUnifiedTrack } from "@/lib/unified-track";

export const maxDuration = 120;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await prisma.studyPlan.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(plan);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Gather performance data
  const wrongAnswers = await prisma.simulationAnswer.findMany({
    where: { isCorrect: false, simulation: { userId } },
    include: {
      question: {
        include: { chapter: { select: { id: true, title: true } } },
      },
    },
  });

  const allAnswers = await prisma.simulationAnswer.findMany({
    where: { simulation: { userId } },
    include: { question: { select: { chapterId: true } } },
  });

  if (allAnswers.length === 0) {
    return NextResponse.json(
      { error: "Realize ao menos um simulado antes de gerar o plano de estudos." },
      { status: 400 }
    );
  }

  // Chapter error rates
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

  const avgScore = recentSimulations.length > 0
    ? recentSimulations.reduce((s: number, sim: { percentage: number }) => s + sim.percentage, 0) / recentSimulations.length
    : 0;

  const prompt = `Você é um coach de estudos especialista em certificação ISTQB CTFL.

Com base nos dados de desempenho abaixo, crie um plano de estudos personalizado em Markdown.

DADOS DE DESEMPENHO:
- Média nos últimos simulados: ${Math.round(avgScore)}%
- Total de simulados realizados: ${recentSimulations.length}
- Meta de aprovação: 65% (26/40 questões — padrão oficial CTFL)

ÁREAS COM MAIOR DIFICULDADE:
${weakAreas.map((c) => `- ${c.title}: ${Math.round(c.errorRate)}% de erro`).join("\n")}

CRIE UM PLANO que inclua:
1. Análise do desempenho atual (2-3 frases)
2. Priorização dos capítulos para estudo (por urgência)
3. Cronograma semanal sugerido (tabela markdown)
4. Técnicas de estudo específicas para cada área fraca
5. Metas de progresso (semanais)
6. Dicas práticas para o exame CTFL

Formato: Markdown estruturado, objetivo e motivador. Use emojis para tornar mais visual.
Idioma: Português brasileiro.`;

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    await logger.error("Falha ao chamar OpenAI para plano de estudos", err, {
      route: "/api/study-plan", method: "POST", userId,
    });
    return NextResponse.json({ error: "Falha ao gerar plano de estudos com IA." }, { status: 500 });
  }

  const content = completion.choices[0].message.content ?? "";

  const existingPlan = await prisma.studyPlan.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  let plan;
  if (existingPlan) {
    plan = await prisma.studyPlan.update({
      where: { id: existingPlan.id },
      data: { content, weakAreas: weakAreas.map((c) => c.title), updatedAt: new Date() },
    });
  } else {
    plan = await prisma.studyPlan.create({
      data: {
        userId,
        content,
        weakAreas: weakAreas.map((c) => c.title),
      },
    });
  }

  // Build / update the single unified CTFL track
  const { created, modulesAdded } = await rebuildUnifiedTrack(userId);
  const pathsCreated = (created || modulesAdded > 0) ? 1 : 0;

  return NextResponse.json({ ...plan, pathsCreated });
}
