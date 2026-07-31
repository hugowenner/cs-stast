import { prisma } from "@/server/db";

export async function findPayloadById(id: string) {
  return prisma.matchPayload.findUnique({
    where: { id },
  });
}

export async function findNextPendingPayload() {
  return prisma.matchPayload.findFirst({
    where: { status: "STORED" },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Tenta reservar atômicamente um payload mudando seu status de STORED para PROCESSING.
 * Retorna true se conseguiu reservar, false se o payload já foi assumido por outro processo.
 */
export async function lockPayloadForProcessing(id: string): Promise<boolean> {
  const result = await prisma.matchPayload.updateMany({
    where: {
      id,
      status: "STORED",
    },
    data: {
      status: "PROCESSING",
    },
  });
  return result.count > 0;
}

export async function markPayloadProcessed(id: string) {
  return prisma.matchPayload.update({
    where: { id },
    data: {
      status: "PROCESSED",
      processedAt: new Date(),
      errorMessage: null,
    },
  });
}

export async function markPayloadFailed(id: string, errorMessage: string) {
  return prisma.matchPayload.update({
    where: { id },
    data: {
      status: "FAILED",
      processedAt: new Date(),
      errorMessage,
    },
  });
}
