import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = (() => {
  try {
    return globalForPrisma.prisma ?? createPrismaClient();
  } catch {
    return null as unknown as PrismaClient;
  }
})();

if (process.env.NODE_ENV !== "production" && prisma) globalForPrisma.prisma = prisma;
