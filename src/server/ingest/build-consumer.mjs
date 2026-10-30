import { build } from "esbuild";
import { resolve } from "node:path";

// Build-time tool only. Runtime uses plain Node and the existing Prisma runtime.
await build({
  entryPoints: [resolve("src/server/ingest/run.ts")], outfile: resolve("normalizer.cjs"),
  bundle: true, platform: "node", target: "node22", format: "cjs", tsconfig: resolve("tsconfig.json"),
  external: ["pg-native", "@prisma/adapter-better-sqlite3", "better-sqlite3"],
  plugins: [{ name: "prisma-runtime-location", setup(context) {
    context.onResolve({ filter: /^@\/generated\/prisma(?:-sqlite)?$/ }, args => ({
      path: args.path.endsWith("-sqlite") ? "./src/generated/prisma-sqlite/index.js" : "./src/generated/prisma/index.js",
      external: true,
    }));
  } }],
});
