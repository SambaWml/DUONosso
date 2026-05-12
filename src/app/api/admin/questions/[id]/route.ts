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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const {
    adminModuleId, statement, imageUrl,
    alternativeA, alternativeB, alternativeC, alternativeD,
    correctAnswer, explanation,
    explanationA, explanationB, explanationC, explanationD,
    difficulty, syllabusRef, orderIndex, isActive,
  } = body;

  const q = await prisma.adminQuestion.update({
    where: { id },
    data: {
      adminModuleId, statement, imageUrl: imageUrl || null,
      alternativeA, alternativeB, alternativeC, alternativeD,
      correctAnswer, explanation,
      explanationA: explanationA || null, explanationB: explanationB || null,
      explanationC: explanationC || null, explanationD: explanationD || null,
      difficulty, syllabusRef: syllabusRef || null,
      orderIndex: Number(orderIndex ?? 0), isActive,
    },
  });
  return NextResponse.json(q);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.adminQuestion.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
