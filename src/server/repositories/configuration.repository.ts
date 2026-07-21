import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma";

export function getConfigValue(key: string) {
  return prisma.configuration.findUnique({ where: { key } });
}

export function setConfigValue(key: string, value: Prisma.InputJsonValue) {
  return prisma.configuration.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export function listConfigValues() {
  return prisma.configuration.findMany();
}
