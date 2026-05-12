import { prisma } from "@/lib/prisma";

type Chapter = { id: string; title: string; orderIndex: number };

function orderByStudyPlan(chapters: Chapter[], weakAreas: string[]): Chapter[] {
  if (weakAreas.length === 0) return chapters;
  const weakRank = new Map(weakAreas.map((t, i) => [t.toLowerCase().trim(), i]));
  const weak = chapters
    .filter((ch) => weakRank.has(ch.title.toLowerCase().trim()))
    .sort((a, b) => (weakRank.get(a.title.toLowerCase().trim()) ?? 99) - (weakRank.get(b.title.toLowerCase().trim()) ?? 99));
  const rest = chapters.filter((ch) => !weakRank.has(ch.title.toLowerCase().trim()));
  return [...weak, ...rest];
}

/**
 * Ensures exactly ONE "Trilha CTFL" exists for the user.
 * - Deletes ALL other paths (old per-material paths created by previous code)
 * - Creates the unified track if it doesn't exist
 * - Reorders modules by study plan weak areas when the plan is available
 * - Preserves completion status of existing modules
 */
async function removeIntroChapters(userId: string) {
  const introChapters = await prisma.chapter.findMany({
    where: {
      material: { userId },
      title: { in: ["Introdução", "__intro__", "Introdução ", "introducao"] },
    },
    select: { id: true },
  });
  if (introChapters.length === 0) return;
  const ids = introChapters.map((c) => c.id);
  await prisma.learningModule.deleteMany({ where: { chapterId: { in: ids } } });
  await prisma.chapter.deleteMany({ where: { id: { in: ids } } });
}

export async function rebuildUnifiedTrack(
  userId: string
): Promise<{ created: boolean; modulesAdded: number }> {
  // Clean up intro/preamble chapters that should never appear in the track
  await removeIntroChapters(userId).catch(() => {});

  const studyPlan = await prisma.studyPlan.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { weakAreas: true },
  });

  const materials = await prisma.material.findMany({
    where: { userId, status: "READY" },
    include: { chapters: { orderBy: { orderIndex: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  // Find all paths first so we can clean up stale ones regardless of chapter count
  const allPaths = await prisma.learningPath.findMany({
    where: { userId },
    include: {
      modules: { select: { id: true, chapterId: true, status: true, orderIndex: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const unified = allPaths.find((p) => p.title === "Trilha CTFL");
  const stale = allPaths.filter((p) => p.title !== "Trilha CTFL");

  // Delete all old per-material paths (do this even if no chapters available)
  if (stale.length > 0) {
    await prisma.learningPath.deleteMany({ where: { id: { in: stale.map((p) => p.id) } } });
  }

  const allChapters: Chapter[] = [
    ...materials.filter((m) => m.type === "SYLLABUS").flatMap((m) => m.chapters),
    ...materials.filter((m) => m.type === "EXAM").flatMap((m) => m.chapters),
  ];

  if (allChapters.length === 0) return { created: false, modulesAdded: 0 };

  const ordered = orderByStudyPlan(allChapters, studyPlan?.weakAreas ?? []);

  if (!unified) {
    // Create the unified track from scratch
    await prisma.$transaction(async (tx) => {
      const path = await tx.learningPath.create({
        data: { user: { connect: { id: userId } }, title: "Trilha CTFL" },
      });
      await tx.learningModule.createMany({
        data: ordered.map((ch, i) => ({
          pathId: path.id,
          chapterId: ch.id,
          title: ch.title,
          orderIndex: i,
          status: (i === 0 ? "UNLOCKED" : "LOCKED") as "UNLOCKED" | "LOCKED",
        })),
      });
    });
    return { created: true, modulesAdded: ordered.length };
  }

  // Unified track exists — add new chapters and reorder
  const existingByChapter = new Map(unified.modules.map((m) => [m.chapterId, m]));
  const newChapters = ordered.filter((ch) => !existingByChapter.has(ch.id));

  await prisma.$transaction(async (tx) => {
    if (newChapters.length > 0) {
      await tx.learningModule.createMany({
        data: newChapters.map((ch, i) => ({
          pathId: unified.id,
          chapterId: ch.id,
          title: ch.title,
          orderIndex: 10000 + i,
          status: "LOCKED" as const,
        })),
      });
    }

    const allMods = await tx.learningModule.findMany({ where: { pathId: unified.id } });
    const rank = new Map(ordered.map((ch, i) => [ch.id, i]));
    const sorted = [...allMods].sort(
      (a, b) => (rank.get(a.chapterId) ?? 9999) - (rank.get(b.chapterId) ?? 9999)
    );

    await Promise.all(
      sorted.map((mod, i) =>
        tx.learningModule.update({ where: { id: mod.id }, data: { orderIndex: i } })
      )
    );

    // Enforce: exactly ONE UNLOCKED module — the first non-COMPLETED one
    const firstNonCompleted = sorted.find((m) => m.status !== "COMPLETED");
    await Promise.all(
      sorted
        .filter((m) => m.status !== "COMPLETED")
        .map((m) =>
          tx.learningModule.update({
            where: { id: m.id },
            data: { status: m.id === firstNonCompleted?.id ? "UNLOCKED" : "LOCKED" },
          })
        )
    );
  });

  return { created: false, modulesAdded: newChapters.length };
}
