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

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const modules = await prisma.adminModule.findMany({
    orderBy: [{ ctflChapter: "asc" }, { orderIndex: "asc" }],
    include: { _count: { select: { questions: true } } },
  });
  return NextResponse.json(modules);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { title, ctflChapter, orderIndex, summary, materialUrl, isActive } = await req.json();
  if (!title || !summary) return NextResponse.json({ error: "title e summary obrigatórios." }, { status: 400 });
  const mod = await prisma.adminModule.create({
    data: { title, ctflChapter: Number(ctflChapter), orderIndex: Number(orderIndex ?? 0), summary, materialUrl: materialUrl || null, isActive: isActive ?? true },
  });
  return NextResponse.json(mod, { status: 201 });
}
