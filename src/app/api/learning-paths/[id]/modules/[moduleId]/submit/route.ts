import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: pathId, moduleId } = await params;
  const { answers } = (await req.json()) as {
    answers: Array<{ questionId: string; selected: string }>;
  };

  const mod = await prisma.learningModule.findFirst({
    where: {
      id: moduleId,
      pathId,
      path: { userId: session.user.id },
      status: { in: ["UNLOCKED", "COMPLETED"] },
    },
    include: {
      path: {
        include: {
          modules: {
            orderBy: { orderIndex: "asc" },
            select: { id: true, orderIndex: true, status: true },
          },
        },
      },
    },
  });

  if (!mod) return NextResponse.json({ error: "Módulo não encontrado." }, { status: 404 });

  // Fetch correct answers for the submitted question IDs
  const questionIds = answers.map((a) => a.questionId);
  const questions = await prisma.question.findMany({
    where: {
      id: { in: questionIds },
      chapter: { material: { userId: session.user.id } },
    },
    select: {
      id: true,
      correctAnswer: true,
      explanation: true,
      explanationA: true,
      explanationB: true,
      explanationC: true,
      explanationD: true,
      statement: true,
      alternativeA: true,
      alternativeB: true,
      alternativeC: true,
      alternativeD: true,
    },
  });

  const qMap = new Map(questions.map((q) => [q.id, q]));

  const evaluated = answers
    .map((a) => {
      const q = qMap.get(a.questionId);
      if (!q) return null;
      const correct = q.correctAnswer === a.selected;
      return {
        questionId: a.questionId,
        selected: a.selected,
        correct,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        explanationA: q.explanationA,
        explanationB: q.explanationB,
        explanationC: q.explanationC,
        explanationD: q.explanationD,
        statement: q.statement,
        alternativeA: q.alternativeA,
        alternativeB: q.alternativeB,
        alternativeC: q.alternativeC,
        alternativeD: q.alternativeD,
      };
    })
    .filter(Boolean);

  const total = evaluated.length;
  const correct = evaluated.filter((e) => e!.correct).length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= 70;

  // Save attempt
  await prisma.moduleAttempt.create({
    data: {
      moduleId,
      userId: session.user.id!,
      score,
      passed,
      answers: evaluated,
    },
  });

  // Update module status
  const updates: Array<Promise<unknown>> = [];

  if (passed && mod.status !== "COMPLETED") {
    updates.push(
      prisma.learningModule.update({
        where: { id: moduleId },
        data: { status: "COMPLETED", bestScore: score },
      })
    );

    // Unlock the next locked module in order (find by next orderIndex, not +1 arithmetic)
    const sortedMods = [...mod.path.modules].sort((a, b) => a.orderIndex - b.orderIndex);
    const currentPos = sortedMods.findIndex((m) => m.id === moduleId);
    const nextMod = currentPos !== -1
      ? sortedMods.slice(currentPos + 1).find((m) => m.status === "LOCKED")
      : undefined;
    if (nextMod) {
      updates.push(
        prisma.learningModule.update({
          where: { id: nextMod.id },
          data: { status: "UNLOCKED" },
        })
      );
    }
  } else if (passed && mod.status === "COMPLETED") {
    if (mod.bestScore === null || score > (mod.bestScore ?? 0)) {
      updates.push(
        prisma.learningModule.update({ where: { id: moduleId }, data: { bestScore: score } })
      );
    }
  }

  await Promise.all(updates);

  return NextResponse.json({ score, passed, total, correct, evaluated });
}
