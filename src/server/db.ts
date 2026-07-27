import { PrismaClient as PrismaClientPg } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientPg };

function createPrismaClient(): PrismaClientPg {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está definida.");

  // new URL() não reconhece "file:./path" — usar split é mais robusto para os formatos
  // que o Prisma aceita (file:./dev.db, postgresql://..., etc.).
  const protocol = url.split(":")[0];

  switch (protocol) {
    case "file":
    case "sqlite": {
      // Os dois require() usam /* turbopackIgnore */ /* webpackIgnore */ para impedir que
      // Turbopack/Webpack resolvam os módulos em build time (eles não existem em produção).
      // As anotações de tipo são inline e só referenciam PrismaClientPg, que sempre existe.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaBetterSqlite3 } = require(/* turbopackIgnore: true */ /* webpackIgnore: true */ "@prisma/adapter-better-sqlite3") as {
        PrismaBetterSqlite3: new (options: { url: string }) => object;
      };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaClient: SqliteClient } = require(/* turbopackIgnore: true */ /* webpackIgnore: true */ "@/generated/prisma-sqlite") as {
        PrismaClient: new (options: { adapter: object }) => PrismaClientPg;
      };
      const adapter = new PrismaBetterSqlite3({ url });
      return new SqliteClient({ adapter });
    }
    case "postgres":
    case "postgresql": {
      const adapter = new PrismaPg(url);
      return new PrismaClientPg({ adapter });
    }
    default:
      throw new Error(
        `DATABASE_URL com protocolo não reconhecido: "${protocol}:". Use file:, sqlite:, postgres: ou postgresql:.`,
      );
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
