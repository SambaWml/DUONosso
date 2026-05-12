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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const mod = await prisma.adminModule.findUnique({
    where: { id },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!mod) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(mod);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.ctflChapter !== undefined) data.ctflChapter = Number(body.ctflChapter);
  if (body.orderIndex !== undefined) data.orderIndex = Number(body.orderIndex);
  if (body.summary !== undefined) data.summary = body.summary;
  if ("materialUrl" in body) data.materialUrl = body.materialUrl || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  const mod = await prisma.adminModule.update({ where: { id }, data });
  return NextResponse.json(mod);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.adminModule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
