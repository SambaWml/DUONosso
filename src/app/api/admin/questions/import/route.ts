import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ImportRow {
  adminModuleId?: string;
  moduleName?: string;
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
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  syllabusRef?: string;
  imageUrl?: string;
  orderIndex?: number;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { questions } = await req.json() as { questions: ImportRow[] };

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "Nenhuma questão para importar." }, { status: 400 });
  }

  const VALID_ANSWER_RE = /^[A-D]{1,4}$/;
  const VALID_DIFFS = new Set(["EASY", "MEDIUM", "HARD"]);

  const errors: string[] = [];
  const valid: ImportRow[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const row = i + 1;
    if (!q.adminModuleId && !q.moduleName) { errors.push(`Linha ${row}: adminModuleId ou moduleName obrigatório`); continue; }
    if (!q.statement?.trim()) { errors.push(`Linha ${row}: statement obrigatório`); continue; }
    if (!q.alternativeA?.trim() || !q.alternativeB?.trim() || !q.alternativeC?.trim() || !q.alternativeD?.trim()) {
      errors.push(`Linha ${row}: todas as alternativas são obrigatórias`); continue;
    }
    const ans = (q.correctAnswer ?? "").toUpperCase().replace(/,\s*/g, "");
    if (!VALID_ANSWER_RE.test(ans)) { errors.push(`Linha ${row}: correctAnswer deve conter apenas as letras A, B, C e/ou D`); continue; }
    q.correctAnswer = ans.length === 1 ? ans : ans.split("").join(",");
    if (!q.explanation?.trim()) { errors.push(`Linha ${row}: explanation obrigatória`); continue; }
    if (q.difficulty && !VALID_DIFFS.has(q.difficulty)) { errors.push(`Linha ${row}: difficulty inválida`); continue; }
    valid.push(q);
  }

  if (valid.length === 0) {
    return NextResponse.json({ error: "Nenhuma questão válida.", details: errors }, { status: 400 });
  }

  // Resolve adminModuleIds — by UUID or by module title
  const needNameLookup = [...new Set(valid.filter((q) => !q.adminModuleId && q.moduleName).map((q) => q.moduleName!))];
  const byIdLookup = [...new Set(valid.filter((q) => q.adminModuleId).map((q) => q.adminModuleId!))];

  const [byName, byId] = await Promise.all([
    needNameLookup.length > 0
      ? prisma.adminModule.findMany({ where: { title: { in: needNameLookup } }, select: { id: true, title: true } })
      : [],
    byIdLookup.length > 0
      ? prisma.adminModule.findMany({ where: { id: { in: byIdLookup } }, select: { id: true } })
      : [],
  ]);

  const nameToId = new Map(byName.map((m) => [m.title, m.id]));
  const validIds = new Set(byId.map((m) => m.id));

  // Attach resolved moduleId to each row
  const resolved = valid.map((q, i) => {
    if (q.adminModuleId) {
      if (!validIds.has(q.adminModuleId)) {
        errors.push(`Linha ${i + 1}: adminModuleId "${q.adminModuleId}" não encontrado`);
        return null;
      }
      return { ...q, resolvedModuleId: q.adminModuleId };
    }
    const id = nameToId.get(q.moduleName!);
    if (!id) {
      errors.push(`Linha ${i + 1}: módulo "${q.moduleName}" não encontrado — crie o módulo antes de importar questões`);
      return null;
    }
    return { ...q, resolvedModuleId: id };
  }).filter(Boolean) as (ImportRow & { resolvedModuleId: string })[];

  if (resolved.length === 0) {
    return NextResponse.json({ error: "Nenhuma questão com módulo válido.", details: errors }, { status: 400 });
  }

  let imported = 0;
  let updated = 0;
  for (let i = 0; i < resolved.length; i++) {
    const q = resolved[i];
    const qData = {
      adminModuleId: q.resolvedModuleId,
      statement: q.statement,
      alternativeA: q.alternativeA,
      alternativeB: q.alternativeB,
      alternativeC: q.alternativeC,
      alternativeD: q.alternativeD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      explanationA: q.explanationA ?? null,
      explanationB: q.explanationB ?? null,
      explanationC: q.explanationC ?? null,
      explanationD: q.explanationD ?? null,
      difficulty: (q.difficulty ?? "MEDIUM") as "EASY" | "MEDIUM" | "HARD",
      syllabusRef: q.syllabusRef ?? null,
      imageUrl: q.imageUrl ?? null,
      orderIndex: q.orderIndex ?? i,
    };
    const existing = await prisma.adminQuestion.findFirst({
      where: { adminModuleId: q.resolvedModuleId, statement: q.statement.trim() },
    });
    if (existing) {
      await prisma.adminQuestion.update({ where: { id: existing.id }, data: qData });
      updated++;
    } else {
      await prisma.adminQuestion.create({ data: qData });
      imported++;
    }
  }

  return NextResponse.json({
    imported,
    skipped: questions.length - resolved.length,
    updated,
    errors: errors.slice(0, 20),
  });
}
