import { prisma } from "@/server/db";
import { PlatformHealthBanner } from "@/components/admin/dashboard/PlatformHealthBanner";
import { ActiveAlerts } from "@/components/admin/dashboard/ActiveAlerts";
import { ServicesGrid } from "@/components/admin/dashboard/ServicesGrid";
import { SyncOverview } from "@/components/admin/dashboard/SyncOverview";
import { PlatformData } from "@/components/admin/dashboard/PlatformData";
import { OperationalTimeline } from "@/components/admin/dashboard/OperationalTimeline";
import type {
  DatabaseHealth,
  IntegrationHealth,
  ServiceHealth,
  SyncStats,
  HealthStatus,
} from "@/lib/admin/health/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Control Center — CS2 Stats Hub Admin",
  description: "Operational control center for CS2 Stats Hub.",
};

async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

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
      const bytes = Number(sizeResult[0]?.size_bytes ?? 0);
      sizeLabel = bytes > 0 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : "N/A";
      version = versionResult[0]?.version;
    } catch {
      // SQLite fallback
    }

    const status: HealthStatus = latencyMs < 200 ? "HEALTHY" : "DEGRADED";
    return { status, latencyMs, sizeLabel, version };
  } catch {
    return { status: "DOWN", sizeLabel: "N/A" };
  }
}

async function getWorkerHealth(): Promise<ServiceHealth> {
  const workerUrl = process.env.SYNC_WORKER_URL;
  if (!workerUrl) {
    return { status: "NOT_CONFIGURED", detail: "SYNC_WORKER_URL not set" };
  }
  try {
    const start = Date.now();
    const res = await fetch(`${workerUrl}/api/health`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;
    return {
      status: res.ok ? "HEALTHY" : "DEGRADED",
      latencyMs,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch {
    return { status: "DOWN", detail: "Unreachable" };
  }
}

function getSteamHealth(): IntegrationHealth {
  const key = process.env.STEAM_API_KEY ?? "";
  const configured = !!key && key !== "your_steam_api_key" && /^[0-9a-fA-F]{32}$/.test(key);
  return {
    configured,
    status: configured ? "HEALTHY" : "NOT_CONFIGURED",
    detail: configured ? undefined : "STEAM_API_KEY missing or invalid format",
  };
}

function getGcHealth(gcGroupId: string | null): IntegrationHealth {
  const configured = !!gcGroupId;
  return {
    configured,
    status: configured ? "HEALTHY" : "DEGRADED",
    detail: configured ? undefined : "GAMERSCLUB_GROUP_ID not configured",
    reason: configured ? undefined : "Group ID missing — match sync cannot run",
  };
}

function getAiHealth(): IntegrationHealth {
  const key = process.env.DEEPSEEK_API_KEY ?? "";
  const configured = !!key && key !== "your_deepseek_api_key";
  return {
    configured,
    status: configured ? "HEALTHY" : "NOT_CONFIGURED",
    detail: configured ? undefined : "DEEPSEEK_API_KEY not configured",
  };
}

function deriveOverallStatus(
  db: DatabaseHealth,
  worker: ServiceHealth,
  steam: IntegrationHealth,
  gc: IntegrationHealth
): HealthStatus {
  if (db.status === "DOWN") return "DOWN";
  if (db.status === "DEGRADED" || worker.status === "DOWN") return "DEGRADED";
  if (!steam.configured || !gc.configured) return "DEGRADED";
  return "HEALTHY";
}

export default async function AdminDashboardPage() {
  const gcGroupId = process.env.GAMERSCLUB_GROUP_ID || null;
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const deepseekModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  // Health checks — worker ping runs concurrently with DB queries
  const [database, worker] = await Promise.all([
    getDatabaseHealth(),
    getWorkerHealth(),
  ]);

  const steam = getSteamHealth();
  const gc = getGcHealth(gcGroupId);
  const ai = getAiHealth();
  const overallStatus = deriveOverallStatus(database, worker, steam, gc);

  // Integrations health count
  const integrationStatuses = [steam, gc, ai];
  const integrationsHealthy = integrationStatuses.filter(
    (s) => s.status === "HEALTHY"
  ).length;

  // Platform data queries — single parallel round trip
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalMatches,
    activeTracked,
    totalPlayers,
    totalMaps,
    roundsAgg,
    killsAgg,
    totalImports,
    successImports,
    todayImports,
    todaySuccess,
    latestSyncRow,
    recentImports,
  ] = await Promise.all([
    prisma.match.count(),
    prisma.trackedPlayer.count({ where: { active: true } }),
    prisma.player.count(),
    prisma.map.count(),
    prisma.match.aggregate({ _sum: { scoreTeamA: true, scoreTeamB: true } }),
    prisma.playerMatchStats.aggregate({ _sum: { kills: true } }),
    prisma.import.count(),
    prisma.import.count({ where: { status: "SUCCESS" } }),
    prisma.import.count({ where: { startedAt: { gte: todayStart } } }),
    prisma.import.count({ where: { status: "SUCCESS", startedAt: { gte: todayStart } } }),
    prisma.import.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
    }),
    prisma.import.findMany({
      take: 8,
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        source: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        matchesImported: true,
        errorMessage: true,
      },
    }),
  ]);

  const totalRounds =
    (roundsAgg._sum.scoreTeamA ?? 0) + (roundsAgg._sum.scoreTeamB ?? 0);
  const totalKills = killsAgg._sum.kills ?? 0;
  const failedImports = totalImports - successImports;
  const successRate = totalImports > 0 ? (successImports / totalImports) * 100 : 100;
  const todayFailed = todayImports - todaySuccess;

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

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">
          Operational Control Center
        </h1>
        <p className="text-xs text-muted-foreground">
          Real-time diagnostics, service health and operational observability.
        </p>
      </div>

      {/* 1. Platform Health Banner */}
      <PlatformHealthBanner
        overallStatus={overallStatus}
        application={{ status: "HEALTHY" }}
        database={database}
        worker={worker}
        integrationsHealthy={integrationsHealthy}
        integrationsTotal={integrationStatuses.length}
        nodeEnv={nodeEnv}
      />

      {/* 2. Active Alerts */}
      <ActiveAlerts
        dbStatus={database.status}
        workerStatus={worker.status}
        steamStatus={steam.status}
        gcStatus={gc.status}
        aiStatus={ai.status}
        gcGroupId={gcGroupId}
      />

      {/* 3. Platform Data */}
      <PlatformData
        totalPlayers={totalPlayers}
        activeTracked={activeTracked}
        totalMatches={totalMatches}
        totalMaps={totalMaps}
        totalRounds={totalRounds}
        totalKills={totalKills}
      />

      {/* 4. Sync Engine + Services side by side on large screens */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SyncOverview sync={sync} />
        </div>
        <div className="lg:col-span-3">
          <ServicesGrid
            database={database}
            worker={worker}
            steam={steam}
            gamersClub={gc}
            ai={ai}
            deepseekModel={deepseekModel}
            gcGroupId={gcGroupId}
          />
        </div>
      </div>

      {/* 5. Operational Timeline */}
      <OperationalTimeline recentImports={recentImports} />
    </div>
  );
}
