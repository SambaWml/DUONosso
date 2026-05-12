import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rebuildUnifiedTrack } from "@/lib/unified-track";

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Always sync the track before loading — adds new admin modules, removes orphans/stale
  await rebuildUnifiedTrack(session.user.id).catch(() => {});

  const [path, studyPlan] = await Promise.all([
    prisma.learningPath.findFirst({
      where: { id, userId: session.user.id },
      include: {
        material: { select: { filename: true, type: true } },
        modules: {
          orderBy: { orderIndex: "asc" },
          include: {
            _count: { select: { attempts: true } },
            attempts: {
              where: { userId: session.user.id },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { score: true, passed: true, createdAt: true },
            },
          },
        },
      },
    }),
    prisma.studyPlan.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: { weakAreas: true },
    }),
  ]);

  if (!path) return NextResponse.json({ error: "Trilha não encontrada." }, { status: 404 });

  const weakSet = new Set((studyPlan?.weakAreas ?? []).map((t) => t.toLowerCase().trim()));
  const modules = path.modules.map((mod) => ({
    ...mod,
    isPriority: weakSet.has(mod.title.toLowerCase().trim()),
  }));

  return NextResponse.json({ ...path, material: path.material ?? null, modules });
}
