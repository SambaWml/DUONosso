import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrichChapterContent } from "@/lib/enrich-content";

export const maxDuration = 120;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const chapter = await prisma.chapter.findFirst({
    where: { id, material: { userId: session.user.id } },
    select: { id: true, title: true, content: true },
  });

  if (!chapter) return NextResponse.json({ error: "Capítulo não encontrado." }, { status: 404 });

  const rich = await enrichChapterContent(chapter.title, chapter.content);

  await prisma.chapter.update({
    where: { id },
    data: { content: rich },
  });

  return NextResponse.json({ content: rich });
}
