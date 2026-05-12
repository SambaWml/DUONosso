import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Removes "Introdução" / "__intro__" chapters from existing materials
// and cleans up learning modules that pointed to them
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const introChapters = await prisma.chapter.findMany({
    where: {
      material: { userId: session.user.id },
      title: { in: ["Introdução", "__intro__", "Introdução ", "introducao"] },
    },
    select: { id: true },
  });

  if (introChapters.length === 0) return NextResponse.json({ removed: 0 });

  const ids = introChapters.map((c) => c.id);

  // Remove learning modules linked to these chapters first
  await prisma.learningModule.deleteMany({ where: { chapterId: { in: ids } } });

  // Remove the chapters (cascades questions)
  await prisma.chapter.deleteMany({ where: { id: { in: ids } } });

  return NextResponse.json({ removed: ids.length });
}
