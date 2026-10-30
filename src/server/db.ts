import { PrismaClient as PrismaClientPg } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma } from "@/generated/prisma";

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

const basePrisma = globalForPrisma.prisma ?? createPrismaClient();
const transactionScope = new AsyncLocalStorage<Prisma.TransactionClient>();

// Repositories and derived projections share the same interactive transaction.
// Nested transaction helpers join the scope; they do not commit independently.
export const prisma = new Proxy(basePrisma, {
  get(target, property) {
    const scoped = transactionScope.getStore();
    if (scoped && property === "$transaction") return async (operation: unknown) => {
      if (typeof operation === "function") return operation(prisma);
      if (Array.isArray(operation)) return Promise.all(operation);
      throw new Error("Unsupported nested transaction operation");
    };
    const instance = scoped ?? target;
    const value = Reflect.get(instance, property);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export function withDatabaseTransaction<T>(run: () => Promise<T>): Promise<T> {
  if (transactionScope.getStore()) return run();
  return basePrisma.$transaction(tx => transactionScope.run(tx, run), {
    isolationLevel: "Serializable", maxWait: 10_000, timeout: 60_000,
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}
