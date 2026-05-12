import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const material = await prisma.material.findFirst({
    where: { id, userId: session.user.id },
    select: { filePath: true },
  });

  if (!material?.filePath) return new NextResponse("PDF não encontrado.", { status: 404 });

  try {
    const pdfBuffer = await readFile(material.filePath);
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Arquivo não encontrado no servidor.", { status: 404 });
  }
}
