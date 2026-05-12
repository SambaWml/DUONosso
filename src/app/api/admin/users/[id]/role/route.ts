import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { role } = await req.json();
  if (role !== "USER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Role inválida." }, { status: 400 });
  }
  // Prevent admin from demoting themselves
  if (role === "USER" && (session.user as { id?: string }).id === id) {
    return NextResponse.json({ error: "Você não pode se rebaixar." }, { status: 400 });
  }
  await prisma.user.update({ where: { id }, data: { role } });
  return NextResponse.json({ success: true });
}
