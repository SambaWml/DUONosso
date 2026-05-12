import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_DEFAULTS, SETTING_LABELS, invalidateSettingsCache, type SettingKey } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.systemConfig.findMany();
  const stored = Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, parseInt(r.value, 10)]));

  const settings = Object.fromEntries(
    (Object.keys(SETTING_DEFAULTS) as SettingKey[]).map((key) => [
      key,
      {
        value: stored[key] ?? SETTING_DEFAULTS[key],
        default: SETTING_DEFAULTS[key],
        ...SETTING_LABELS[key],
      },
    ])
  );

  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as Record<string, number>;

  const validKeys = new Set(Object.keys(SETTING_DEFAULTS));
  const ops = Object.entries(body)
    .filter(([key, val]) => validKeys.has(key) && typeof val === "number" && !isNaN(val))
    .map(([key, val]) => {
      const meta = SETTING_LABELS[key as SettingKey];
      const clamped = Math.max(meta.min, Math.min(meta.max, Math.round(val)));
      return prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(clamped) },
        create: { key, value: String(clamped) },
      });
    });

  await Promise.all(ops);
  invalidateSettingsCache();

  return NextResponse.json({ ok: true });
}
