import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ImportQuestion {
  statement: string;
  alternativeA: string;
  alternativeB: string;
  alternativeC: string;
  alternativeD: string;
  correctAnswer: string;
  explanation: string;
  explanationA?: string;
  explanationB?: string;
  explanationC?: string;
  explanationD?: string;
  difficulty?: string;
  syllabusRef?: string;
  imageUrl?: string;
  orderIndex?: number;
}

interface ImportModule {
  title: string;
  ctflChapter: number;
  orderIndex?: number;
  summary: string;
  materialUrl?: string;
  isActive?: boolean;
  questions?: ImportQuestion[];
}

const VALID_ANSWERS = new Set(["A", "B", "C", "D"]);
const VALID_DIFFS = new Set(["EASY", "MEDIUM", "HARD"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { modules: ImportModule[] };

  if (!Array.isArray(body.modules) || body.modules.length === 0) {
    return NextResponse.json({ error: "Campo 'modules' deve ser um array não vazio." }, { status: 400 });
  }

  let modulesCreated = 0;
  let modulesUpdated = 0;
  let questionsCreated = 0;
  const errors: string[] = [];

  for (let mi = 0; mi < body.modules.length; mi++) {
    const m = body.modules[mi];
    const label = `Módulo ${mi + 1} ("${m.title ?? ""}")`;

    if (!m.title?.trim()) { errors.push(`${label}: title obrigatório`); continue; }
    if (!m.summary?.trim()) { errors.push(`${label}: summary obrigatório`); continue; }
    if (!m.ctflChapter || m.ctflChapter < 1 || m.ctflChapter > 6) {
      errors.push(`${label}: ctflChapter deve ser 1–6`); continue;
    }

    const existing = await prisma.adminModule.findFirst({ where: { title: m.title.trim() } });
    let moduleId: string;

    if (existing) {
      await prisma.adminModule.update({
        where: { id: existing.id },
        data: {
          ctflChapter: m.ctflChapter,
          orderIndex: m.orderIndex ?? existing.orderIndex,
          summary: m.summary,
          materialUrl: m.materialUrl || null,
          isActive: m.isActive ?? existing.isActive,
        },
      });
      moduleId = existing.id;
      modulesUpdated++;
    } else {
      const created = await prisma.adminModule.create({
        data: {
          title: m.title.trim(),
          ctflChapter: m.ctflChapter,
          orderIndex: m.orderIndex ?? 0,
          summary: m.summary,
          materialUrl: m.materialUrl || null,
          isActive: m.isActive ?? true,
        },
      });
      moduleId = created.id;
      modulesCreated++;
    }

    const questions = Array.isArray(m.questions) ? m.questions : [];
    const valid: ImportQuestion[] = [];

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const ql = `${label} / Questão ${qi + 1}`;
      if (!q.statement?.trim()) { errors.push(`${ql}: statement obrigatório`); continue; }
      if (!q.alternativeA?.trim() || !q.alternativeB?.trim() || !q.alternativeC?.trim() || !q.alternativeD?.trim()) {
        errors.push(`${ql}: todas as alternativas são obrigatórias`); continue;
      }
      if (!VALID_ANSWERS.has(q.correctAnswer)) { errors.push(`${ql}: correctAnswer deve ser A, B, C ou D`); continue; }
      if (!q.explanation?.trim()) { errors.push(`${ql}: explanation obrigatória`); continue; }
      if (q.difficulty && !VALID_DIFFS.has(q.difficulty)) { errors.push(`${ql}: difficulty inválida (use EASY, MEDIUM ou HARD)`); continue; }
      valid.push(q);
    }

    for (let qi = 0; qi < valid.length; qi++) {
      const q = valid[qi];
      const qData = {
        adminModuleId: moduleId,
        statement: q.statement,
        alternativeA: q.alternativeA,
        alternativeB: q.alternativeB,
        alternativeC: q.alternativeC,
        alternativeD: q.alternativeD,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        explanationA: q.explanationA || null,
        explanationB: q.explanationB || null,
        explanationC: q.explanationC || null,
        explanationD: q.explanationD || null,
        difficulty: (q.difficulty ?? "MEDIUM") as "EASY" | "MEDIUM" | "HARD",
        syllabusRef: q.syllabusRef || null,
        imageUrl: q.imageUrl || null,
        orderIndex: q.orderIndex ?? qi,
      };
      const existing = await prisma.adminQuestion.findFirst({
        where: { adminModuleId: moduleId, statement: q.statement.trim() },
      });
      if (existing) {
        await prisma.adminQuestion.update({ where: { id: existing.id }, data: qData });
      } else {
        await prisma.adminQuestion.create({ data: qData });
        questionsCreated++;
      }
    }
  }

  return NextResponse.json({ modulesCreated, modulesUpdated, questionsCreated, errors: errors.slice(0, 30) });
}
