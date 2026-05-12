import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import pdfParse from "pdf-parse";
import { logger } from "@/lib/logger";
import { rebuildUnifiedTrack } from "@/lib/unified-track";
import { enrichChapterContent, inferChapterTitle } from "@/lib/enrich-content";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;

  if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Apenas PDFs são aceitos." }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Arquivo muito grande. Máximo 20MB." }, { status: 400 });

  // Read buffer once — reused for quick page count and full parse
  const buffer = Buffer.from(await file.arrayBuffer());

  // Quick parse (renders only 1 page of text) to get real page count before returning 202
  const { numpages: pageCount } = await pdfParse(buffer, { max: 1 });

  const materialType = (type === "EXAM" ? "EXAM" : "SYLLABUS") as "EXAM" | "SYLLABUS";

  // Upsert by filename: if the same file was uploaded before, delete it first so we don't duplicate
  const existing = await prisma.material.findFirst({
    where: { userId: session.user.id, filename: file.name },
    select: { id: true, filePath: true },
  });
  if (existing) {
    await prisma.material.delete({ where: { id: existing.id } });
    // Remove old PDF from disk (best-effort)
    if (existing.filePath) {
      const { unlink } = await import("fs/promises");
      await unlink(existing.filePath).catch(() => {});
    }
  }

  const material = await prisma.material.create({
    data: {
      userId: session.user.id,
      filename: file.name,
      fileSize: file.size,
      status: "PROCESSING",
      type: materialType,
    },
  });

  // Save original PDF to disk for page-level viewing (diagrams, images)
  const uploadsDir = path.join(process.cwd(), "uploads");
  const filePath = path.join(uploadsDir, `${material.id}.pdf`);
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(filePath, buffer);
  await prisma.material.update({ where: { id: material.id }, data: { filePath } });

  // Process PDF asynchronously — buffer passed directly to avoid re-reading
  const uid = session.user?.id;
  processAndSavePDF(material.id, buffer, uid).catch(async (err) => {
    await logger.error("Falha ao processar PDF", err, {
      route: "/api/materials",
      method: "POST",
      userId: uid,
      metadata: { materialId: material.id, filename: file.name },
    });
    await prisma.material.update({
      where: { id: material.id },
      data: { status: "ERROR" },
    });
  });

  // pdf-parse + parallel question generation per chapter (~15s per page + OpenAI)
  const estimatedSeconds = Math.max(60, pageCount * 3);

  return NextResponse.json(
    { materialId: material.id, pageCount, fileSizeMB: +(file.size / (1024 * 1024)).toFixed(1), estimatedSeconds },
    { status: 202 }
  );
}

async function processAndSavePDF(materialId: string, buffer: Buffer, userId?: string) {
  // Extract text per page using pdf-parse pagerender callback
  const pageTexts: string[] = [];
  const data = await pdfParse(buffer, {
    pagerender: (pageData: { getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }) =>
      pageData.getTextContent().then((tc) => {
        const text = tc.items.map((i) => i.str ?? "").join(" ");
        pageTexts.push(text);
        return text;
      }),
  });
  const rawText = data.text;
  const totalPages = data.numpages;
  const chapters = extractChapters(rawText);

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { type: true },
  });
  const materialType = material?.type ?? "SYLLABUS";

  // Detect which PDF page each chapter starts on
  function findStartPage(title: string): number {
    const needle = title.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 40);
    for (let p = 0; p < pageTexts.length; p++) {
      if (pageTexts[p].toLowerCase().includes(needle)) return p + 1;
    }
    return 1;
  }

  const chapterPageStarts = chapters.map((ch) => findStartPage(ch.title));

  // Enrich each chapter content and save — questions are generated on first simulation/module use
  const isGenericTitle = (t: string) => /^se[çc][ãa]o\s+\d+\.?\s*$/i.test(t.trim());

  await Promise.allSettled(
    chapters.map(async (chapter, i) => {
      // If the extractor fell back to "Seção N", ask GPT to infer the real chapter name
      const title = isGenericTitle(chapter.title)
        ? await inferChapterTitle(chapter.title, chapter.content).catch(() => chapter.title)
        : chapter.title;

      const richContent = await enrichChapterContent(title, chapter.content).catch(() => chapter.content);
      const startPage = chapterPageStarts[i];
      const endPage = chapterPageStarts[i + 1] ? chapterPageStarts[i + 1] - 1 : totalPages;
      await prisma.chapter.create({
        data: { materialId, title, content: richContent, orderIndex: i, startPage, endPage },
      });
    })
  );

  // Mark READY after chapters are saved
  await prisma.material.update({
    where: { id: materialId },
    data: { status: "READY", totalPages },
  });

  // Add chapters to the single unified CTFL track
  if (userId) {
    await rebuildUnifiedTrack(userId).catch(() => {/* non-critical */});
  }
}


function extractChapters(text: string): { title: string; content: string }[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const chapters: { title: string; content: string[] }[] = [];

  function isHeading(line: string): boolean {
    if (line.length > 90) return false;

    // Reject inline references: lines ending with sentence punctuation
    if (/[.)]\s*$/.test(line)) return false;

    // Reject TOC entries that carry timing info "(N minuto(s))" or "- N min"
    if (/\(\d+\s*minutos?\)/i.test(line)) return false;
    if (/[-–]\s*\d+\s*min\b/i.test(line)) return false;

    // "Capítulo N –" / "Capítulo N –" / "Chapter N –" with any separator
    if (/^cap[íi]tulo\s+\d+\s*[–—:–-]/i.test(line)) return true;
    if (/^chapter\s+\d+\s*[–—:–-]/i.test(line)) return true;

    // Plain numbered section "N Title" — single digit only (chapters 1–9), must not look like a list item
    if (/^[1-9]\s+[A-ZÁÉÍÓÚÂÊÎÔÛÃÕ].{4,60}$/.test(line)) return true;

    return false;
  }

  let current: { title: string; content: string[] } | null = null;

  for (const line of lines) {
    if (isHeading(line)) {
      if (current) chapters.push(current);
      current = { title: line, content: [] };
    } else {
      // Accumulate pre-chapter text under a temporary intro bucket (not saved)
      if (!current) current = { title: "__intro__", content: [] };
      current.content.push(line);
    }
  }
  if (current) chapters.push(current);

  // Deduplicate: for chapters sharing the same leading number, keep the one with most content
  const seen = new Map<string, number>();
  const deduped: { title: string; content: string[] }[] = [];

  for (const ch of chapters) {
    const m = ch.title.match(/^(?:cap[íi]tulo\s+)?([0-9]+)/i);
    const key = m ? m[1] : ch.title.toLowerCase().slice(0, 20);
    const idx = seen.get(key);
    if (idx === undefined) {
      seen.set(key, deduped.length);
      deduped.push(ch);
    } else if (ch.content.length > deduped[idx].content.length) {
      deduped[idx] = ch;
    }
  }

  // Remove intro/preamble — keep only real numbered chapters when they exist
  const realChapters = deduped.filter((c) => c.title !== "__intro__");

  if (realChapters.length > 0) {
    // SYLLABUS: use only the numbered chapters, drop intro/preamble entirely
    if (realChapters.length <= 1 && lines.length > 50) {
      // Fallback: single-chapter or undetected structure → split into 6 sections
      const chunkSize = Math.ceil(lines.length / 6);
      return Array.from({ length: 6 }, (_, i) => ({
        title: `Seção ${i + 1}`,
        content: lines.slice(i * chunkSize, (i + 1) * chunkSize).join("\n"),
      }));
    }
    return realChapters.map((c) => ({ title: c.title, content: c.content.join("\n") }));
  }

  // No real chapters found (e.g. EXAM PDF) — use everything including preamble
  if (deduped.length <= 1 && lines.length > 50) {
    const chunkSize = Math.ceil(lines.length / 6);
    return Array.from({ length: 6 }, (_, i) => ({
      title: `Seção ${i + 1}`,
      content: lines.slice(i * chunkSize, (i + 1) * chunkSize).join("\n"),
    }));
  }

  return deduped.map((c) => ({ title: c.title, content: c.content.join("\n") }));
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const materialId = searchParams.get("materialId");

  if (materialId) {
    const material = await prisma.material.findFirst({
      where: { id: materialId, userId: session.user.id },
      include: {
        chapters: {
          include: { _count: { select: { questions: true } } },
          orderBy: { orderIndex: "asc" },
        },
      },
    });
    return NextResponse.json(material);
  }

  const materials = await prisma.material.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chapters: true } } },
  });

  if (materials.length === 0) return NextResponse.json([]);

  const chapterRows = await prisma.chapter.findMany({
    where: { materialId: { in: materials.map((m) => m.id) } },
    select: { materialId: true, _count: { select: { questions: true } } },
  });

  const questionsCount: Record<string, number> = {};
  for (const ch of chapterRows) {
    questionsCount[ch.materialId] = (questionsCount[ch.materialId] ?? 0) + ch._count.questions;
  }

  return NextResponse.json(
    materials.map((m) => ({ ...m, questionsCount: questionsCount[m.id] ?? 0 }))
  );
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const materialId = searchParams.get("id");

  if (!materialId) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });

  await prisma.material.deleteMany({
    where: { id: materialId, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
