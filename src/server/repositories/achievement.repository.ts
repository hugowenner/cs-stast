import { prisma } from "@/server/db";

export function listAchievementCatalog() {
  return prisma.achievement.findMany({ orderBy: [{ tier: "asc" }, { name: "asc" }] });
}

export function findAchievementByCode(code: string) {
  return prisma.achievement.findUnique({ where: { code } });
}

export function upsertAchievement(data: {
  code: string;
  name: string;
  description: string;
  iconUrl?: string | null;
  tier: string;
}) {
  return prisma.achievement.upsert({
    where: { code: data.code },
    create: data,
    update: data,
  });
}
