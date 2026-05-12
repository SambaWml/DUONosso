import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrichChapterContent } from "@/lib/enrich-content";
import { generateQuestionsForChapter } from "@/lib/generate-questions";
import { getSettings } from "@/lib/settings";

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: pathId, moduleId } = await params;

  const mod = await prisma.learningModule.findFirst({
    where: {
      id: moduleId,
      pathId,
      path: { userId: session.user.id },
      status: { in: ["UNLOCKED", "COMPLETED"] },
    },
    include: {
      adminModule: {
        include: {
          questions: {
            where: { isActive: true },
            select: {
              id: true, statement: true, imageUrl: true,
              alternativeA: true, alternativeB: true, alternativeC: true, alternativeD: true,
              difficulty: true, syllabusRef: true,
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      },
      chapter: {
        include: {
          questions: {
            select: {
              id: true, statement: true,
              alternativeA: true, alternativeB: true, alternativeC: true, alternativeD: true,
              difficulty: true, syllabusRef: true,
            },
          },
          material: { select: { id: true, type: true, filePath: true } },
        },
      },
    },
  });

  if (!mod) return NextResponse.json({ error: "Módulo não encontrado ou bloqueado." }, { status: 404 });

  // ── Admin module path ────────────────────────────────────────────────────
  if (mod.adminModule) {
    const settings = await getSettings();
    const adminQs = mod.adminModule.questions;
    if (adminQs.length < 1) return NextResponse.json({ error: "Módulo sem questões cadastradas pelo admin." }, { status: 404 });
    const picked = [...adminQs].sort(() => Math.random() - 0.5).slice(0, Math.min(settings.MODULE_QUIZ_QUESTION_COUNT, adminQs.length));
    return NextResponse.json({
      questions: picked.map((q) => ({ ...q, source: "admin" })),
      moduleTitle: mod.title,
      chapterContent: mod.adminModule.summary,
      chapterId: mod.adminModule.id,
      materialUrl: mod.adminModule.materialUrl ?? null,
      pdfUrl: null,
      startPage: null,
      endPage: null,
    });
  }

  if (!mod.chapter) return NextResponse.json({ error: "Módulo sem conteúdo." }, { status: 404 });

  let questions = mod.chapter.questions;

  const settings = await getSettings();
  // Generate questions on first use if chapter has none
  if (questions.length < settings.MODULE_QUIZ_QUESTION_COUNT) {
    await generateQuestionsForChapter(
      mod.chapter.id,
      mod.title,
      mod.chapter.content ?? "",
      mod.chapter.material?.type ?? "SYLLABUS",
      session.user.id
    );

    const fresh = await prisma.question.findMany({
      where: { chapterId: mod.chapter.id },
      select: {
        id: true,
        statement: true,
        alternativeA: true,
        alternativeB: true,
        alternativeC: true,
        alternativeD: true,
        difficulty: true,
        syllabusRef: true,
      },
    });
    questions = fresh;
  }

  if (questions.length < settings.MODULE_QUIZ_QUESTION_COUNT) {
    return NextResponse.json({ error: "Não foi possível gerar questões suficientes." }, { status: 500 });
  }

  const picked = [...questions].sort(() => Math.random() - 0.5).slice(0, settings.MODULE_QUIZ_QUESTION_COUNT);

  // Enrich chapter content on-the-fly if it's still plain text (no markdown markers)
  let chapterContent = mod.chapter.content ?? "";

  // Re-enrich if: plain text OR old-format content (missing the "O que Cai na Prova" section)
  const needsEnrich =
    (chapterContent.length > 50 && !/^#{1,3}\s|\|.+\||\*\*.+\*\*|^[-*]\s/m.test(chapterContent)) ||
    !chapterContent.includes("Cai na Prova");

  if (needsEnrich) {
    try {
      const rich = await enrichChapterContent(mod.title, chapterContent);
      chapterContent = rich;
      await prisma.chapter.update({
        where: { id: mod.chapter.id },
        data: { content: rich },
      });
    } catch { /* fall back to existing content */ }
  }

  const hasPdf = !!mod.chapter.material?.filePath;

  return NextResponse.json({
    questions: picked,
    moduleTitle: mod.title,
    chapterContent,
    chapterId: mod.chapter.id,
    pdfUrl: hasPdf ? `/api/materials/${mod.chapter.material!.id}/pdf` : null,
    startPage: mod.chapter.startPage ?? null,
    endPage: mod.chapter.endPage ?? null,
  });
}
