import { prisma } from "@/server/db";
import type { ImportStatus, Prisma } from "@/generated/prisma";

export function createImportLog(
  source: string,
  options: { rawPayload?: Prisma.InputJsonValue; providerVersion?: number } = {},
) {
  return prisma.import.create({
    data: {
      source,
      status: "RUNNING",
      rawPayload: options.rawPayload,
      providerVersion: options.providerVersion,
    },
  });
}

export function completeImportLog(
  id: string,
  data: { status: ImportStatus; matchesImported?: number; errorMessage?: string | null },
) {
  return prisma.import.update({
    where: { id },
    data: { ...data, finishedAt: new Date() },
  });
}

export function listImports(take = 50) {
  return prisma.import.findMany({ orderBy: { startedAt: "desc" }, take });
}
