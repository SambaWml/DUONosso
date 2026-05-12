import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inferChapterTitle } from "@/lib/enrich-content";

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Renames all "Seção N" chapters for the user using GPT-4o content inference. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allChapters = await prisma.chapter.findMany({
    where: { material: { userId: session.user.id } },
    select: { id: true, title: true, content: true },
  });

  const genericChapters = allChapters.filter((ch) => {
    const t = ch.title.trim();
    // "Seção N" or "Seção N." variants
    if (/^se[çc][ãa]o\s+\d+\.?\s*$/i.test(t)) return true;
    // Titles wrapped in quotes: "2. Ciclos de Vida..." or '5. Gestão de Testes'
    if (/^["'""'].+["'""']$/.test(t)) return true;
    return false;
  });

  if (genericChapters.length === 0) return NextResponse.json({ renamed: 0 });

  let renamed = 0;

  await Promise.allSettled(
    genericChapters.map(async (ch) => {
      try {
        const t = ch.title.trim();
        let newTitle: string;

        if (/^["'""'].+["'""']$/.test(t)) {
          // Just strip the surrounding quotes — no GPT call needed
          newTitle = t.replace(/^["'""]+|["'""]+$/g, "").trim();
        } else {
          newTitle = await inferChapterTitle(t, ch.content ?? "");
        }

        if (!newTitle || newTitle === ch.title) return;

        await prisma.chapter.update({ where: { id: ch.id }, data: { title: newTitle } });
        await prisma.learningModule.updateMany({
          where: { chapterId: ch.id },
          data: { title: newTitle },
        });

        renamed++;
      } catch { /* skip on failure */ }
    })
  );

  return NextResponse.json({ renamed });
}
