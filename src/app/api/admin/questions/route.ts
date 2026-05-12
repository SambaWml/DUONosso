import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  if ((session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const questions = await prisma.adminQuestion.findMany({
    orderBy: [{ adminModuleId: "asc" }, { orderIndex: "asc" }],
    include: { adminModule: { select: { title: true, ctflChapter: true } } },
  });
  return NextResponse.json(questions);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const {
    adminModuleId, statement, imageUrl,
    alternativeA, alternativeB, alternativeC, alternativeD,
    correctAnswer, explanation,
    explanationA, explanationB, explanationC, explanationD,
    difficulty, syllabusRef, orderIndex, isActive,
  } = body;

  if (!adminModuleId || !statement || !alternativeA || !alternativeB || !alternativeC || !alternativeD || !correctAnswer || !explanation) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }

  const q = await prisma.adminQuestion.create({
    data: {
      adminModuleId, statement, imageUrl: imageUrl || null,
      alternativeA, alternativeB, alternativeC, alternativeD,
      correctAnswer, explanation,
      explanationA: explanationA || null, explanationB: explanationB || null,
      explanationC: explanationC || null, explanationD: explanationD || null,
      difficulty: difficulty ?? "MEDIUM",
      syllabusRef: syllabusRef || null,
      orderIndex: Number(orderIndex ?? 0),
      isActive: isActive ?? true,
    },
  });
  return NextResponse.json(q, { status: 201 });
}
