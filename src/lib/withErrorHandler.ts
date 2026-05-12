import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse | Response>;

export function withErrorHandler(handler: Handler, routeName?: string): Handler {
  return async (req, ctx) => {
    const route = routeName ?? req.nextUrl.pathname;
    const method = req.method;

    try {
      return await handler(req, ctx);
    } catch (error) {
      const session = await auth().catch(() => null);

      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "Erro interno do servidor";

      await logger.error(message, error, {
        route,
        method,
        userId: session?.user?.id,
        userEmail: session?.user?.email ?? undefined,
        metadata: {
          url: req.url,
          userAgent: req.headers.get("user-agent") ?? undefined,
        },
      });

      return NextResponse.json(
        { error: "Erro interno do servidor. Tente novamente." },
        { status: 500 }
      );
    }
  };
}
