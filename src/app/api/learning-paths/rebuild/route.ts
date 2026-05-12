import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rebuildUnifiedTrack } from "@/lib/unified-track";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await rebuildUnifiedTrack(session.user.id);
  return NextResponse.json(result);
}
