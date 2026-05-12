import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rebuildUnifiedTrack } from "@/lib/unified-track";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Sync track on every list load — ensures new/removed admin modules are reflected
  await rebuildUnifiedTrack(session.user.id).catch(() => {});

  const paths = await prisma.learningPath.findMany({
    where: { userId: session.user.id },
    include: {
      material: { select: { filename: true, type: true } },
      modules: { select: { id: true, status: true, title: true, adminModuleId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(paths);
}
