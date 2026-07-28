import { prisma } from "@/server/db";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Calendar, Award, Database, RefreshCw, Swords, ShieldCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/components/admin/players/PlayersSummaryCards";

interface DetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PlayerDetailPage({ params }: DetailPageProps) {
  const { id } = await params;

  // Fetch player and match stats in parallel
  const [player, recentMatches] = await Promise.all([
    prisma.player.findUnique({
      where: { id },
      include: {
        trackedPlayer: true,
        _count: {
          select: {
            matchStats: true,
          },
        },
      },
    }),
    prisma.playerMatchStats.findMany({
      where: { playerId: id },
      take: 10,
      orderBy: { match: { playedAt: "desc" } },
      include: {
        match: {
          include: {
            map: true,
          },
        },
      },
    }),
  ]);

  if (!player) {
    notFound();
  }

  // Calculate monitoring status
  const hasGc = !!player.gamersClubId;
  const hasSteam = !!player.steamId;
  const lastSyncDate = player.steamLastSync;
  const isActive = player.trackedPlayer?.active ?? false;
  const matchCount = player._count.matchStats;

  let statusText = "Monitorando";
  let statusBadgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  let statusIndicator = "bg-emerald-400";

  if (!isActive) {
    statusText = "Pausado";
    statusBadgeClass = "bg-white/5 text-muted-foreground border-white/10";
    statusIndicator = "bg-muted-foreground";
  } else if (!hasGc || !hasSteam || matchCount === 0 || !lastSyncDate) {
    statusText = "Falha";
    statusBadgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
    statusIndicator = "bg-rose-400";
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/admin/players"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Voltar para Lista de Jogadores</span>
        </Link>
      </div>

      {/* Header Profile Info Card */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 shadow-xl flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
        {/* Avatar */}
        <div className="size-20 rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0 shadow-inner">
          {player.avatarUrl ? (
            <img
              src={player.avatarUrl}
              alt={player.nickname}
              className="size-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="size-10 text-muted-foreground/40" />
          )}
        </div>

        {/* Text Metadata */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
              {player.nickname}
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", statusBadgeClass)}>
              <span className={cn("size-1.5 rounded-full animate-pulse", statusIndicator)} />
              {statusText}
            </span>
            {player.levelGc !== null && (
              <span className="bg-primary/20 border border-primary/30 text-primary text-[9px] font-bold px-1.5 rounded uppercase tracking-wider">
                Level GC {player.levelGc}
              </span>
            )}
          </div>
          {player.steamNickname && (
            <p className="text-xs text-muted-foreground">
              Nome na Steam: <span className="text-foreground font-medium">{player.steamNickname}</span>
            </p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Membro cadastrado em {new Date(player.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Grid of basic info + monitoring metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Básicas Card */}
        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Database className="size-4" /> Informações Básicas
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-white/[0.03] pb-2">
              <span className="text-muted-foreground">ID Interno:</span>
              <span className="text-foreground font-mono select-all">{player.id}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.03] pb-2">
              <span className="text-muted-foreground">Steam ID64:</span>
              <span className="text-foreground font-mono select-all">{player.steamId}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.03] pb-2">
              <span className="text-muted-foreground">ID Gamers Club:</span>
              <span className="text-foreground font-mono select-all">{player.gamersClubId || "Ausente"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Integração Steam:</span>
              <span className="text-foreground font-medium flex items-center gap-1">
                {hasSteam ? (
                  <>
                    <ShieldCheck className="size-3.5 text-emerald-400" />
                    <span>Conectada</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="size-3.5 text-rose-400" />
                    <span>Pendente</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Histórico de Monitoramento Card */}
        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <RefreshCw className="size-4" /> Monitoramento & Sync
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-white/[0.03] pb-2">
              <span className="text-muted-foreground">Total de Partidas:</span>
              <span className="text-foreground font-semibold flex items-center gap-1">
                <Swords className="size-3.5 text-muted-foreground" />
                {matchCount}
              </span>
            </div>
            <div className="flex justify-between border-b border-white/[0.03] pb-2">
              <span className="text-muted-foreground">Última Sincronização:</span>
              <span className="text-foreground">{formatRelativeTime(player.steamLastSync)}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.03] pb-2">
              <span className="text-muted-foreground">Última Partida:</span>
              <span className="text-foreground">
                {recentMatches[0] ? formatRelativeTime(recentMatches[0].match.playedAt) : "Nenhuma"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coleta Automática:</span>
              <span className="text-foreground font-semibold">
                {isActive ? "🟢 Ativa (Ingestão Automática)" : "⚪ Suspensa (Ignorando Jogador)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico Recente de Partidas */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Últimas 10 Partidas no Hub</h2>

        {recentMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-lg text-center text-xs text-muted-foreground min-h-[120px]">
            Nenhuma partida importada registrada para este jogador.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Mapa</th>
                  <th className="px-4 py-2">Placar</th>
                  <th className="px-4 py-2">ELO Variação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.01] text-xs">
                {recentMatches.map((stat) => {
                  const playedAtDate = new Date(stat.match.playedAt);
                  const eloDiff = stat.eloAfter - stat.eloBefore;
                  const isEloPositive = eloDiff >= 0;

                  return (
                    <tr key={stat.id} className="hover:bg-white/[0.005]">
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {playedAtDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às{" "}
                        {playedAtDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {stat.match.map.name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        <span className="text-foreground font-semibold">
                          {stat.match.scoreTeamA} : {stat.match.scoreTeamB}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        <span className={isEloPositive ? "text-emerald-400" : "text-rose-400"}>
                          {isEloPositive ? "+" : ""}
                          {eloDiff} ELO
                        </span>{" "}
                        <span className="text-[10px] text-muted-foreground/60">
                          ({stat.eloBefore} → {stat.eloAfter})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
