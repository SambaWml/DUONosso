import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");
  const search = searchParams.get("search");
  const route = searchParams.get("route");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 50;

  const where = {
    ...(level && level !== "ALL" ? { level: level as "INFO" | "WARN" | "ERROR" | "FATAL" } : {}),
    ...(search ? {
      OR: [
        { message: { contains: search, mode: "insensitive" as const } },
        { route: { contains: search, mode: "insensitive" as const } },
        { userEmail: { contains: search, mode: "insensitive" as const } },
        { stack: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
    ...(route ? { route: { contains: route, mode: "insensitive" as const } } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.systemLog.count({ where }),
  ]);

  const summary = await prisma.systemLog.groupBy({
    by: ["level"],
    _count: { id: true },
  });

  return NextResponse.json({ logs, total, page, limit, summary });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const clearAll = searchParams.get("clearAll");

  if (clearAll === "true") {
    await prisma.systemLog.deleteMany({});
    return NextResponse.json({ success: true });
  }

  if (id) {
    await prisma.systemLog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Parâmetro obrigatório." }, { status: 400 });
}
