import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [simulations, materials, totalQuestions] = await Promise.all([
    prisma.simulation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, score: true, totalQuestions: true, percentage: true, createdAt: true },
    }),
    prisma.material.count({ where: { userId } }),
    prisma.question.count({
      where: { chapter: { material: { userId } } },
    }),
  ]);

  const allSimulations = await prisma.simulation.findMany({
    where: { userId },
    select: { percentage: true },
  });

  const averageScore =
    allSimulations.length > 0
      ? allSimulations.reduce((sum: number, s: { percentage: number }) => sum + s.percentage, 0) / allSimulations.length
      : 0;

  const wrongAnswers = await prisma.simulationAnswer.findMany({
    where: {
      isCorrect: false,
      simulation: { userId },
    },
    include: {
      question: {
        include: { chapter: { select: { id: true, title: true } } },
      },
    },
  });

  const chapterErrorMap: Record<string, { title: string; errors: number; total: number }> = {};
  for (const ans of wrongAnswers) {
    const cid = ans.question.chapterId;
    const ctitle = ans.question.chapter.title;
    if (!chapterErrorMap[cid]) chapterErrorMap[cid] = { title: ctitle, errors: 0, total: 0 };
    chapterErrorMap[cid].errors++;
  }

  const allAnswers = await prisma.simulationAnswer.findMany({
    where: { simulation: { userId } },
    include: { question: { select: { chapterId: true } } },
  });
  for (const ans of allAnswers) {
    const cid = ans.question.chapterId;
    if (chapterErrorMap[cid]) chapterErrorMap[cid].total++;
  }

  const weakChapters = Object.entries(chapterErrorMap)
    .map(([chapterId, v]) => ({ chapterId, chapterTitle: v.title, errorCount: v.errors, totalAnswered: v.total }))
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 5);

  return NextResponse.json({
    totalSimulations: allSimulations.length,
    averageScore: Math.round(averageScore * 10) / 10,
    totalQuestions,
    totalMaterials: materials,
    recentSimulations: simulations.map((s: { id: string; score: number; totalQuestions: number; percentage: number; createdAt: Date }) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })),
    weakChapters,
  });
}
