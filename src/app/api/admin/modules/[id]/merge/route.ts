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

// POST /api/admin/modules/[id]/merge  body: { deleteId: string }
// Moves all questions from deleteId into [id] (keepId), then deletes deleteId.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: keepId } = await params;
  const { deleteId } = (await req.json()) as { deleteId: string };

  if (keepId === deleteId) {
    return NextResponse.json({ error: "Não é possível mesclar um módulo com ele mesmo." }, { status: 400 });
  }

  const [keepMod, deleteMod] = await Promise.all([
    prisma.adminModule.findUnique({ where: { id: keepId }, include: { _count: { select: { questions: true } } } }),
    prisma.adminModule.findUnique({ where: { id: deleteId }, include: { questions: { orderBy: { orderIndex: "asc" }, select: { id: true } } } }),
  ]);

  if (!keepMod || !deleteMod) {
    return NextResponse.json({ error: "Módulo não encontrado." }, { status: 404 });
  }

  const baseIndex = keepMod._count.questions;

  await prisma.$transaction([
    // Re-index and move questions from the module being deleted
    ...deleteMod.questions.map((q, i) =>
      prisma.adminQuestion.update({
        where: { id: q.id },
        data: { adminModuleId: keepId, orderIndex: baseIndex + i + 1 },
      })
    ),
    // Delete the duplicate module
    prisma.adminModule.delete({ where: { id: deleteId } }),
  ]);

  return NextResponse.json({ success: true, movedCount: deleteMod.questions.length });
}
