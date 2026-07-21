#!/usr/bin/env node
/**
 * Deriva prisma/schema.sqlite.prisma a partir de prisma/schema.prisma (fonte única de
 * verdade) trocando só o provider e o output do client — nunca mantido à mão, sempre
 * gerado. Assim o schema real (Postgres) nunca diverge silenciosamente do usado no
 * modo demo.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = join(__dirname, "../../prisma/schema.prisma");
const target = join(__dirname, "../../prisma/schema.sqlite.prisma");

let schema = readFileSync(source, "utf8");

schema = schema.replace(
  'output   = "../src/generated/prisma"',
  'output   = "../src/generated/prisma-sqlite"',
);
schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');

const header = `// GERADO por scripts/demo/generate-sqlite-schema.mjs a partir de schema.prisma.\n// Não editar à mão — mude schema.prisma e rode \`npm run demo\` de novo.\n\n`;

writeFileSync(target, header + schema);
console.log("[demo] prisma/schema.sqlite.prisma gerado a partir de schema.prisma");
