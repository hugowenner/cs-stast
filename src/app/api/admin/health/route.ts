import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { prisma } from "@/server/db";
import type { HealthStatus, DatabaseHealth, IntegrationHealth, ServiceHealth, SyncStats } from "@/lib/admin/health/types";

export const dynamic = "force-dynamic";

interface HealthResponse {
  timestamp: string;
  environment: string;
  database: DatabaseHealth;
  application: ServiceHealth;
  worker: ServiceHealth;
  integrations: {
    steam: IntegrationHealth;
    gamersClub: IntegrationHealth;
    ai: IntegrationHealth;
  };
  sync: SyncStats;
  overallStatus: HealthStatus;
}

function deriveOverallStatus(
  db: ServiceHealth,
  worker: ServiceHealth,
  steam: IntegrationHealth,
  gc: IntegrationHealth
): HealthStatus {
  if (db.status === "DOWN") return "DOWN";
  if (db.status === "DEGRADED" || worker.status === "DOWN") return "DEGRADED";
  if (!steam.configured || !gc.configured) return "DEGRADED";
  return "HEALTHY";
}

export async function GET(): Promise<NextResponse> {
  const isAuth = await checkAdminAuth();
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timestamp = new Date().toISOString();
  const environment = process.env.NODE_ENV ?? "development";

  // --- Database health ---
  let database: DatabaseHealth = { status: "UNKNOWN", sizeLabel: "N/A" };
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - dbStart;

    let sizeLabel = "N/A";
    let version: string | undefined;
    try {
      const [sizeResult, versionResult] = await Promise.all([
        prisma.$queryRawUnsafe<{ size_bytes: bigint }[]>(
          `SELECT pg_database_size(current_database()) AS size_bytes`
        ),
        prisma.$queryRawUnsafe<{ version: string }[]>(
          `SELECT split_part(version(), ' ', 2) AS version`
        ),
      ]);
      const sizeBytes = Number(sizeResult[0]?.size_bytes ?? 0);
      sizeLabel = sizeBytes > 0 ? (sizeBytes / (1024 * 1024)).toFixed(2) + " MB" : "N/A";
      version = versionResult[0]?.version;
    } catch {
      // SQLite fallback — size and version unavailable
    }

    const status: HealthStatus = latencyMs < 200 ? "HEALTHY" : "DEGRADED";
    database = { status, latencyMs, sizeLabel, version };
  } catch {
    database = { status: "DOWN", sizeLabel: "N/A" };
  }

  // --- Application health (always healthy if this code runs) ---
  const application: ServiceHealth = { status: "HEALTHY" };

  // --- Worker health ---
  const workerUrl = process.env.SYNC_WORKER_URL;
  let worker: ServiceHealth;
  if (!workerUrl) {
    worker = { status: "NOT_CONFIGURED", detail: "SYNC_WORKER_URL not set" };
  } else {
    try {
      const workerStart = Date.now();
      const res = await fetch(`${workerUrl}/api/health`, {
        signal: AbortSignal.timeout(4000),
      });
      const latencyMs = Date.now() - workerStart;
      worker = {
        status: res.ok ? "HEALTHY" : "DEGRADED",
        latencyMs,
        detail: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch {
      worker = { status: "DOWN", detail: "Unreachable" };
    }
  }

  // --- Integrations ---
  const steamKey = process.env.STEAM_API_KEY ?? "";
  const steamConfigured =
    !!steamKey && steamKey !== "your_steam_api_key" && /^[0-9a-fA-F]{32}$/.test(steamKey);
  const steam: IntegrationHealth = {
    configured: steamConfigured,
    status: steamConfigured ? "HEALTHY" : "NOT_CONFIGURED",
    detail: steamConfigured ? undefined : "STEAM_API_KEY missing or invalid format",
  };

  const gcGroupId = process.env.GAMERSCLUB_GROUP_ID ?? "";
  const gcConfigured = !!gcGroupId;
  const gamersClub: IntegrationHealth = {
    configured: gcConfigured,
    status: gcConfigured ? "HEALTHY" : "DEGRADED",
    detail: gcConfigured ? undefined : "GAMERSCLUB_GROUP_ID not configured",
    reason: gcConfigured ? undefined : "Group ID missing — match sync cannot run",
  };

  const deepseekKey = process.env.DEEPSEEK_API_KEY ?? "";
  const aiConfigured = !!deepseekKey && deepseekKey !== "your_deepseek_api_key";
  const ai: IntegrationHealth = {
    configured: aiConfigured,
    status: aiConfigured ? "HEALTHY" : "NOT_CONFIGURED",
    detail: aiConfigured ? undefined : "DEEPSEEK_API_KEY not configured",
  };

  // --- Sync stats ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalImports, successImports, todayImports, todaySuccess, latestSyncRow] =
    await Promise.all([
      prisma.import.count(),
      prisma.import.count({ where: { status: "SUCCESS" } }),
      prisma.import.count({ where: { startedAt: { gte: todayStart } } }),
      prisma.import.count({
        where: { status: "SUCCESS", startedAt: { gte: todayStart } },
      }),
      prisma.import.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { finishedAt: "desc" },
        select: { finishedAt: true },
      }),
    ]);

  const failedImports = totalImports - successImports;
  const todayFailed = todayImports - todaySuccess;
  const successRate = totalImports > 0 ? (successImports / totalImports) * 100 : 100;

  const sync: SyncStats = {
    totalImports,
    successImports,
    failedImports,
    successRate,
    latestSync: latestSyncRow?.finishedAt ?? null,
    todayAttempts: todayImports,
    todaySuccess,
    todayFailed,
  };

  const overallStatus = deriveOverallStatus(database, worker, steam, gamersClub);

  const body: HealthResponse = {
    timestamp,
    environment,
    database,
    application,
    worker,
    integrations: { steam, gamersClub, ai },
    sync,
    overallStatus,
  };

  return NextResponse.json(body);
}
