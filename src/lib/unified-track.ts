import { prisma } from "@/lib/prisma";

type ModuleSource = { id: string; title: string; orderIndex: number };

function orderByStudyPlan(modules: ModuleSource[], weakAreas: string[]): ModuleSource[] {
  if (weakAreas.length === 0) return modules;
  const weakRank = new Map(weakAreas.map((t, i) => [t.toLowerCase().trim(), i]));
  const weak = modules
    .filter((m) => weakRank.has(m.title.toLowerCase().trim()))
    .sort((a, b) => (weakRank.get(a.title.toLowerCase().trim()) ?? 99) - (weakRank.get(b.title.toLowerCase().trim()) ?? 99));
  const rest = modules.filter((m) => !weakRank.has(m.title.toLowerCase().trim()));
  return [...weak, ...rest];
}

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

/**
 * Ensures exactly ONE "Trilha CTFL" exists for the user.
 * Prefers AdminModule records when available; falls back to Chapter-based track.
 */
export async function rebuildUnifiedTrack(
  userId: string
): Promise<{ created: boolean; modulesAdded: number }> {
  await removeIntroChapters(userId).catch(() => {});

  const studyPlan = await prisma.studyPlan.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { weakAreas: true },
  });

  const allPaths = await prisma.learningPath.findMany({
    where: { userId },
    include: {
      modules: { select: { id: true, chapterId: true, adminModuleId: true, status: true, orderIndex: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const unified = allPaths.find((p) => p.title === "Trilha CTFL");
  const stale = allPaths.filter((p) => p.title !== "Trilha CTFL");
  if (stale.length > 0) {
    await prisma.learningPath.deleteMany({ where: { id: { in: stale.map((p) => p.id) } } });
  }

  // ── Admin modules path ────────────────────────────────────────────────────
  const adminModules = await prisma.adminModule.findMany({
    where: { isActive: true },
    orderBy: [{ ctflChapter: "asc" }, { orderIndex: "asc" }],
    select: { id: true, title: true, ctflChapter: true, orderIndex: true },
  });

  if (adminModules.length > 0) {
    const sources: ModuleSource[] = adminModules.map((m) => ({ id: m.id, title: m.title, orderIndex: m.orderIndex }));
    const ordered = orderByStudyPlan(sources, studyPlan?.weakAreas ?? []);

    if (!unified) {
      await prisma.$transaction(async (tx) => {
        const path = await tx.learningPath.create({
          data: { user: { connect: { id: userId } }, title: "Trilha CTFL" },
        });
        await tx.learningModule.createMany({
          data: ordered.map((m, i) => ({
            pathId: path.id,
            adminModuleId: m.id,
            title: m.title,
            orderIndex: i,
            status: (i === 0 ? "UNLOCKED" : "LOCKED") as "UNLOCKED" | "LOCKED",
          })),
        });
      });
      return { created: true, modulesAdded: ordered.length };
    }

    const existingByAdmin = new Map(unified.modules.map((m) => [m.adminModuleId, m]));
    const newAdminMods = ordered.filter((m) => !existingByAdmin.has(m.id));

    await prisma.$transaction(async (tx) => {
      if (newAdminMods.length > 0) {
        await tx.learningModule.createMany({
          data: newAdminMods.map((m, i) => ({
            pathId: unified.id,
            adminModuleId: m.id,
            title: m.title,
            orderIndex: 10000 + i,
            status: "LOCKED" as const,
          })),
        });
      }

      const allMods = await tx.learningModule.findMany({ where: { pathId: unified.id } });
      const rank = new Map(ordered.map((m, i) => [m.id, i]));
      const sorted = [...allMods].sort(
        (a, b) => (rank.get(a.adminModuleId ?? "") ?? 9999) - (rank.get(b.adminModuleId ?? "") ?? 9999)
      );

      await Promise.all(
        sorted.map((mod, i) =>
          tx.learningModule.update({ where: { id: mod.id }, data: { orderIndex: i } })
        )
      );

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

    return { created: false, modulesAdded: newAdminMods.length };
  }

  // ── Fallback: Chapter-based track ─────────────────────────────────────────
  const materials = await prisma.material.findMany({
    where: { userId, status: "READY" },
    include: { chapters: { orderBy: { orderIndex: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const allChapters = [
    ...materials.filter((m) => m.type === "SYLLABUS").flatMap((m) => m.chapters),
    ...materials.filter((m) => m.type === "EXAM").flatMap((m) => m.chapters),
  ];

  if (allChapters.length === 0) return { created: false, modulesAdded: 0 };

  const ordered = orderByStudyPlan(allChapters, studyPlan?.weakAreas ?? []);

  if (!unified) {
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
      (a, b) => (rank.get(a.chapterId ?? "") ?? 9999) - (rank.get(b.chapterId ?? "") ?? 9999)
    );

    await Promise.all(
      sorted.map((mod, i) =>
        tx.learningModule.update({ where: { id: mod.id }, data: { orderIndex: i } })
      )
    );

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
