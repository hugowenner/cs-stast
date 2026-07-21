import { prisma } from "@/server/db";

export function upsertMapByName(name: string) {
  return prisma.map.upsert({
    where: { name },
    create: { name },
    update: {},
  });
}

export function listMaps() {
  return prisma.map.findMany({ orderBy: { name: "asc" } });
}
