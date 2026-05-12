import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// Bootstrap route: promotes a user to ADMIN by email.
// Only works when there are ZERO admins in the database.
export async function POST(req: NextRequest) {
  const { email, secret } = await req.json();

  if (!secret || secret !== process.env.ADMIN_SEED_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) {
    return NextResponse.json({ error: "Já existe um admin. Use /admin/users para gerenciar roles." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });

  return NextResponse.json({ success: true, message: `${email} promovido a ADMIN. Faça login novamente.` });
}
