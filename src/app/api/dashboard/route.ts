import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [simulations, totalAdminQuestions, totalAdminModules, allSimulations] = await Promise.all([
    prisma.simulation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, score: true, totalQuestions: true, percentage: true, createdAt: true },
    }),
    prisma.adminQuestion.count({ where: { isActive: true } }),
    prisma.adminModule.count({ where: { isActive: true } }),
    prisma.simulation.findMany({
      where: { userId },
      select: { percentage: true },
    }),
  ]);

  const averageScore =
    allSimulations.length > 0
      ? allSimulations.reduce((sum: number, s: { percentage: number }) => sum + s.percentage, 0) / allSimulations.length
      : 0;

  const allAnswers = await prisma.simulationAnswer.findMany({
    where: { simulation: { userId } },
    include: {
      question: { include: { chapter: { select: { id: true, title: true } } } },
      adminQuestion: { include: { adminModule: { select: { id: true, title: true } } } },
    },
  });

  const chapterErrorMap: Record<string, { title: string; errors: number; total: number }> = {};

  for (const ans of allAnswers) {
    let key: string | undefined;
    let title: string | undefined;

    if (ans.adminQuestionId && ans.adminQuestion?.adminModule) {
      key = ans.adminQuestion.adminModule.id;
      title = ans.adminQuestion.adminModule.title;
    } else if (ans.questionId && ans.question) {
      key = ans.question.chapterId ?? undefined;
      title = ans.question.chapter?.title ?? undefined;
    }

    if (!key || !title) continue;
    if (!chapterErrorMap[key]) chapterErrorMap[key] = { title, errors: 0, total: 0 };
    chapterErrorMap[key].total++;
    if (!ans.isCorrect) chapterErrorMap[key].errors++;
  }

  const weakChapters = Object.entries(chapterErrorMap)
    .map(([chapterId, v]) => ({ chapterId, chapterTitle: v.title, errorCount: v.errors, totalAnswered: v.total }))
    .filter((c) => c.totalAnswered > 0)
    .sort((a, b) => (b.errorCount / b.totalAnswered) - (a.errorCount / a.totalAnswered))
    .slice(0, 5);

  return NextResponse.json({
    totalSimulations: allSimulations.length,
    averageScore: Math.round(averageScore * 10) / 10,
    totalQuestions: totalAdminQuestions,
    totalMaterials: totalAdminModules,
    recentSimulations: simulations.map((s: { id: string; score: number; totalQuestions: number; percentage: number; createdAt: Date }) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })),
    weakChapters,
  });
}
