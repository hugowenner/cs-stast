import { PrismaClient as PrismaClientPg } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
// import type — apagado em runtime. Mantido só para as asserções de compatibilidade abaixo.
import type { PrismaClient as PrismaClientSqlite } from "@/generated/prisma-sqlite";
import type { PrismaBetterSqlite3 as PrismaBetterSqlite3Type } from "@prisma/adapter-better-sqlite3";

// Verifica em tempo de compilação que os dois clients são mutuamente atribuíveis.
// Se os schemas divergirem, este arquivo deixa de compilar antes de qualquer problema em runtime.
type AssertAssignable<T extends U, U> = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _Check1 = AssertAssignable<PrismaClientSqlite, PrismaClientPg>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _Check2 = AssertAssignable<PrismaClientPg, PrismaClientSqlite>;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientPg };

function createPrismaClient(): PrismaClientPg {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está definida.");

  // new URL() não reconhece "file:./path" como URL válida — usar split é mais robusto
  // para os formatos que o Prisma aceita (file:./dev.db, postgresql://..., etc.).
  const protocol = url.split(":")[0];

  switch (protocol) {
    case "file":
    case "sqlite": {
      // require() condicional: @prisma/adapter-better-sqlite3 está em devDependencies e usa
      // bindings nativos — não pode ser bundled pelo Webpack. Importar no topo causaria falha
      // em produção (Vercel) mesmo que o branch nunca fosse executado.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3") as {
        PrismaBetterSqlite3: typeof PrismaBetterSqlite3Type;
      };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaClient: SqliteClient } = require("@/generated/prisma-sqlite") as {
        PrismaClient: typeof PrismaClientSqlite;
      };
      const adapter = new PrismaBetterSqlite3({ url });
      // Cast seguro: garantido pelas asserções estruturais _Check1/_Check2 acima.
      return new SqliteClient({ adapter }) as unknown as PrismaClientPg;
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
