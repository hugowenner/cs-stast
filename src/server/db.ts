import { DriverAdapter, PrismaClient, buildAdapterOptions } from "@/server/db.provider";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new DriverAdapter(buildAdapterOptions());

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
