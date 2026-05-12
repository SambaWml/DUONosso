import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Question error rates (top 10 most missed)
  const answerRows = await prisma.simulationAnswer.findMany({
    where: { adminQuestionId: { not: null } },
    select: { adminQuestionId: true, isCorrect: true },
  });

  // Aggregate per question in JS (avoids Prisma groupBy _sum typing issues)
  const qAggMap: Record<string, { total: number; correct: number }> = {};
  for (const r of answerRows) {
    const key = r.adminQuestionId!;
    if (!qAggMap[key]) qAggMap[key] = { total: 0, correct: 0 };
    qAggMap[key].total++;
    if (r.isCorrect) qAggMap[key].correct++;
  }

  const questionIds = Object.keys(qAggMap);
  const questions = questionIds.length > 0
    ? await prisma.adminQuestion.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, statement: true, adminModule: { select: { title: true } } },
      })
    : [];

  const qMap = new Map(questions.map((q) => [q.id, q]));

  const questionStats = questionIds
    .map((qid) => {
      const q = qMap.get(qid);
      if (!q) return null;
      const { total, correct } = qAggMap[qid];
      const errorRate = total > 0 ? Math.round(((total - correct) / total) * 100) : 0;
      return { id: qid, statement: q.statement, moduleName: q.adminModule.title, total, errorRate };
    })
    .filter(Boolean)
    .sort((a, b) => b!.errorRate - a!.errorRate)
    .slice(0, 10) as { id: string; statement: string; moduleName: string; total: number; errorRate: number }[];

  // Module completion rates
  const modules = await prisma.adminModule.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      ctflChapter: true,
      _count: { select: { questions: true } },
    },
    orderBy: [{ ctflChapter: "asc" }, { orderIndex: "asc" }],
  });

  const learningModules = await prisma.learningModule.groupBy({
    by: ["adminModuleId", "status"],
    where: { adminModuleId: { not: null } },
    _count: { id: true },
  });

  const moduleStatusMap: Record<string, { COMPLETED: number; UNLOCKED: number; LOCKED: number }> = {};
  for (const lm of learningModules) {
    const key = lm.adminModuleId!;
    if (!moduleStatusMap[key]) moduleStatusMap[key] = { COMPLETED: 0, UNLOCKED: 0, LOCKED: 0 };
    moduleStatusMap[key][lm.status as "COMPLETED" | "UNLOCKED" | "LOCKED"] += lm._count.id;
  }

  const moduleStats = modules.map((m) => {
    const s = moduleStatusMap[m.id] ?? { COMPLETED: 0, UNLOCKED: 0, LOCKED: 0 };
    const total = s.COMPLETED + s.UNLOCKED + s.LOCKED;
    return {
      id: m.id,
      title: m.title,
      ctflChapter: m.ctflChapter,
      questionCount: m._count.questions,
      completedByUsers: s.COMPLETED,
      totalUsers: total,
      completionRate: total > 0 ? Math.round((s.COMPLETED / total) * 100) : 0,
    };
  });

  // Overall numbers
  const [totalUsers, activeUsers, totalModules, totalQuestions] = await Promise.all([
    prisma.user.count(),
    prisma.simulation.groupBy({ by: ["userId"], _count: { id: true } }).then((r) => r.length),
    prisma.adminModule.count({ where: { isActive: true } }),
    prisma.adminQuestion.count({ where: { isActive: true } }),
  ]);

  return NextResponse.json({ questionStats, moduleStats, totalUsers, activeUsers, totalModules, totalQuestions });
}
