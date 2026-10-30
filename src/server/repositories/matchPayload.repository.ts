import { prisma } from "@/server/db";

// Legacy payloads are a read model. State changes belong to a fenced durable
// normalization job, never to an unversioned payload id or a blanket scan.
export function findPayloadById(id: string) {
  return prisma.matchPayload.findUnique({ where: { id } });
}
