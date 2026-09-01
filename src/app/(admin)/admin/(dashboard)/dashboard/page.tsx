import { prisma } from "@/server/db";
import { AdminStatsCards } from "@/components/admin/dashboard/AdminStatsCards";
import { SystemHealthCards } from "@/components/admin/dashboard/SystemHealthCards";
import { ServiceStatus } from "@/components/admin/dashboard/ServiceStatus";
import { RecentActivity } from "@/components/admin/dashboard/RecentActivity";
import { QuickMetrics } from "@/components/admin/dashboard/QuickMetrics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Painel Admin — CS2 Stats Hub",
  description: "Visão geral administrativa do sistema.",
};

export default async function AdminDashboardPage() {
  const start = Date.now();
  
  // Database ping logic
  let isDbConnected = false;
  let dbLatency = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbConnected = true;
    dbLatency = Date.now() - start;
  } catch (e) {
    console.error("Database health check failed:", e);
  }

  // Database size logic
  let dbSize = "Indisponível";
  try {
    const sizeResult = await prisma.$queryRawUnsafe<{ size_bytes: bigint }[]>(
      `SELECT pg_database_size(current_database()) AS size_bytes`
    );
    const sizeBytes = Number(sizeResult[0]?.size_bytes || 0);
    if (sizeBytes > 0) {
      dbSize = (sizeBytes / (1024 * 1024)).toFixed(2) + " MB";
    }
  } catch (e) {
    // SQLite or no-permissions fallback
    console.warn("Could not retrieve real database size, using estimated metadata.", e);
  }

  // Parallel database metrics fetching (zero N+1 queries)
  const [
    totalMatches,
    activeTracked,
    totalPlayers,
    totalMaps,
    roundsSum,
    killsSum,
    latestMatch,
    totalImports,
    successImports,
    latestSyncLog,
    recentImports,
  ] = await Promise.all([
    prisma.match.count(),
    prisma.trackedPlayer.count({ where: { active: true } }),
    prisma.player.count(),
    prisma.map.count(),
    prisma.match.aggregate({
      _sum: {
        scoreTeamA: true,
        scoreTeamB: true,
      },
    }),
    prisma.playerMatchStats.aggregate({
      _sum: {
        kills: true,
      },
    }),
    prisma.match.findFirst({
      orderBy: { playedAt: "desc" },
      include: { map: true },
    }),
    prisma.import.count(),
    prisma.import.count({ where: { status: "SUCCESS" } }),
    prisma.import.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { finishedAt: "desc" },
    }),
    prisma.import.findMany({
      take: 5,
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const successRate = totalImports > 0 ? (successImports / totalImports) * 100 : 100;
  const latestSync = latestSyncLog?.finishedAt || null;
  const totalRounds = (roundsSum._sum.scoreTeamA || 0) + (roundsSum._sum.scoreTeamB || 0);
  const totalKills = killsSum._sum.kills || 0;

  // Integrations verification
  const steamKey = process.env.STEAM_API_KEY;
  const isSteamConfigured = !!steamKey && steamKey !== "your_steam_api_key";
  const isSteamKeyValid = isSteamConfigured && /^[0-9a-fA-F]{32}$/.test(steamKey);

  const gcGroupId = process.env.GAMERSCLUB_GROUP_ID || null;
  const isGcConfigured = !!gcGroupId;

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const isDeepseekConfigured = !!deepseekKey && deepseekKey !== "your_deepseek_api_key";
  const deepseekModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  const nodeEnv = process.env.NODE_ENV || "development";

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header section */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">
          Visão Geral do Hub
        </h1>
        <p className="text-xs text-muted-foreground">
          Diagnósticos de infraestrutura, integridade das integrações e observabilidade operacional.
        </p>
      </div>

      {/* 1. Upper stats metrics */}
      <AdminStatsCards
        totalMatches={totalMatches}
        activeTracked={activeTracked}
        successRate={successRate}
        totalImports={totalImports}
        latestSync={latestSync}
        dbLatency={dbLatency}
        dbSize={dbSize}
      />

      {/* 2. System status and health check */}
      <SystemHealthCards
        dbLatency={dbLatency}
        isDbConnected={isDbConnected}
        nodeEnv={nodeEnv}
      />
      
      {/* 3. Service details check */}
      <ServiceStatus
        dbLatency={dbLatency}
        isSteamConfigured={isSteamConfigured}
        isSteamKeyValid={isSteamKeyValid}
        isGcConfigured={isGcConfigured}
        gcGroupId={gcGroupId}
        latestSyncDate={latestSync}
        isDeepseekConfigured={isDeepseekConfigured}
        deepseekModel={deepseekModel}
      />

      {/* 4. Timeline activity and quick platform metrics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuickMetrics
            totalPlayers={totalPlayers}
            totalMaps={totalMaps}
            totalRounds={totalRounds}
            totalKills={totalKills}
            latestMatch={latestMatch}
          />
        </div>

        <div>
          <RecentActivity recentImports={recentImports} />
        </div>
      </div>
    </div>
  );
}
