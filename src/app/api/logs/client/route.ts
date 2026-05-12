import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const { message, stack, componentStack, route } = await request.json();

    await logger.error(`[CLIENT] ${message}`, undefined, {
      route: route ?? request.headers.get("referer") ?? "client",
      method: "CLIENT",
      userId: session?.user?.id,
      userEmail: session?.user?.email ?? undefined,
      metadata: {
        stack,
        componentStack,
        userAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
