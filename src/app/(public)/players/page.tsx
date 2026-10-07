import { SectionContainer } from "@/components/dashboard/section-container";
import { PageHeader } from "@/components/ui/page-header";
import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { FORMA_STYLE } from "@/lib/forma";
import { Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { safeQuery } from "@/server/safeQuery";
import * as playerService from "@/server/services/player.service";
import * as competitiveService from "@/server/services/competitive.service";

export const dynamic = "force-dynamic";

function getFormaBadgeVariant(forma: string): "good" | "warning" | "neutral" {
  if (forma === "Excelente" || forma === "Em alta") return "good";
  if (forma === "Oscilando") return "warning";
  return "neutral";
}

export default async function PlayersPage() {
  // Carrega o dataset completo do banco para manter a consistência de cálculo do Dashboard
  const dataset = await competitiveService.loadCompetitiveDataset();
  const bundle = await competitiveService.getDashboardCompetitiveBundle(dataset);
  const monitoredPlayers = bundle.monitoredPlayers;

  // Busca todos os jogadores monitorados ativos do banco
  const players = await safeQuery(() => playerService.listPlayers({ take: 100 }), []);

  // Mapeia os dados do bundle por ID do jogador para acesso O(1)
  const monitoredByPlayerId = new Map(monitoredPlayers.map((p) => [p.player.id, p]));

  // Ordena os jogadores competitivamente:
  // 1. Ranking atual da temporada (rank menor primeiro)
  // 2. Rating médio da temporada (desempate, maior rating primeiro)
  // 3. Quantidade de partidas analisadas (maior primeiro)
  // Jogadores sem partidas ou sem dados suficientes aparecem no final ordenados alfabeticamente.
  const sortedPlayers = [...players].sort((a, b) => {
    const entryA = monitoredByPlayerId.get(a.id);
    const entryB = monitoredByPlayerId.get(b.id);

    if (entryA && entryB) {
      if (entryA.rank !== entryB.rank) {
        return entryA.rank - entryB.rank;
      }
      if (entryA.rating !== entryB.rating) {
        return entryB.rating - entryA.rating;
      }
      return entryB.matchCount - entryA.matchCount;
    }

    if (entryA && !entryB) return -1;
    if (!entryA && entryB) return 1;

    return a.nickname.localeCompare(b.nickname);
  });

  return (
    <div className="flex flex-col gap-6">
      <FadeIn>
        <PageHeader
          title="Jogadores"
          subtitle="Roster completo. Inteligência tática e métricas operacionais do elenco."
        />
      </FadeIn>

      <SectionContainer
        title="Roster de Jogadores"
        subtitle={`${players.length} jogadores monitorados nesta temporada`}
        delay={0.05}
      >
        {sortedPlayers.length === 0 ? (
          <div className="surface-panel rounded-sm border border-border/40 p-12 text-center">
            <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-mono text-muted-foreground/50">
              Nenhum jogador monitorado sincronizado ainda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedPlayers.map((player) => {
              const entry = monitoredByPlayerId.get(player.id);
              const isTop1 = entry?.rank === 1;

              if (entry) {
                const forma = FORMA_STYLE[entry.forma] ?? FORMA_STYLE["Oscilando"];

                return (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className={cn(
                      "surface-panel rounded-sm border overflow-hidden flex flex-col group transition-all duration-150",
                      "hover:border-primary/50 hover:bg-surface-elevated/40",
                      isTop1
                        ? "border-gold/40 shadow-xs"
                        : "border-border/40"
                    )}
                  >
                    {/* Header do Card: Rank • Avatar • Nick/GC • Forma • Arrow */}
                    <div className="px-3.5 py-2.5 border-b border-border/30 bg-surface-deck/50 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Posição Operacional */}
                        <span
                          className={cn(
                            "font-mono text-xs font-black tabular-nums shrink-0 w-6 text-center leading-none",
                            isTop1 ? "text-gold" : "text-white/40"
                          )}
                        >
                          #{String(entry.rank).padStart(2, "0")}
                        </span>

                        {/* Avatar */}
                        <div className="shrink-0 rounded-xs overflow-hidden border border-border/50">
                          <PlayerAvatar
                            nickname={player.nickname}
                            avatarUrl={player.avatarUrl}
                            size="sm"
                          />
                        </div>

                        {/* Nick e Nível GC */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight group-hover:text-primary transition-colors">
                            {player.nickname}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {player.levelGc ? (
                              <span className="font-mono text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                                GC {player.levelGc}
                              </span>
                            ) : (
                              <span className="font-mono text-[9px] text-muted-foreground/40 uppercase tracking-wider">
                                GC —
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status / Forma & Seta de Ação */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <TacticalBadge
                          label={forma.text.toUpperCase()}
                          variant={getFormaBadgeVariant(entry.forma)}
                          size="xs"
                        />
                        <ArrowRight className="size-3 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Faixa de Telemetria Integrada */}
                    <div className="px-3.5 py-2.5 grid grid-cols-3 gap-2 text-center bg-surface-panel">
                      <div className="flex flex-col items-center justify-center min-w-0">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
                          Rating
                        </span>
                        <span
                          className={cn(
                            "text-sm sm:text-base font-mono font-black tabular-nums mt-0.5 leading-none",
                            isTop1 ? "text-gold" : "text-white"
                          )}
                        >
                          <AnimatedNumber value={entry.rating} decimals={2} duration={0.8} />
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center min-w-0 border-x border-border/30 px-1">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
                          Winrate
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-white/90 tabular-nums mt-0.5 leading-none">
                          <AnimatedNumber value={entry.winrate} decimals={0} suffix="%" duration={0.6} />
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center min-w-0">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
                          Partidas
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-medium text-muted-foreground/80 tabular-nums mt-0.5 leading-none">
                          {entry.matchCount} {entry.matchCount === 1 ? "jogo" : "jogos"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              } else {
                // Fallback seguro: jogador cadastrado que possui 0 partidas na temporada
                return (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className={cn(
                      "surface-panel rounded-sm border border-border/40 overflow-hidden flex flex-col group transition-all duration-150",
                      "hover:border-primary/50 hover:bg-surface-elevated/40 opacity-75 hover:opacity-100"
                    )}
                  >
                    {/* Header do Card */}
                    <div className="px-3.5 py-2.5 border-b border-border/30 bg-surface-deck/50 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-white/30 tabular-nums shrink-0 w-6 text-center leading-none">
                          —
                        </span>
                        <div className="shrink-0 rounded-xs overflow-hidden border border-border/50">
                          <PlayerAvatar
                            nickname={player.nickname}
                            avatarUrl={player.avatarUrl}
                            size="sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight group-hover:text-primary transition-colors">
                            {player.nickname}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {player.levelGc ? (
                              <span className="font-mono text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                                GC {player.levelGc}
                              </span>
                            ) : (
                              <span className="font-mono text-[9px] text-muted-foreground/40 uppercase tracking-wider">
                                GC —
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <TacticalBadge label="SEM AMOSTRA" variant="neutral" size="xs" />
                        <ArrowRight className="size-3 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Faixa de Telemetria Integrada (Sem dados) */}
                    <div className="px-3.5 py-2.5 grid grid-cols-3 gap-2 text-center bg-surface-panel">
                      <div className="flex flex-col items-center justify-center min-w-0">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
                          Rating
                        </span>
                        <span className="text-sm sm:text-base font-mono font-bold text-muted-foreground/40 tabular-nums mt-0.5 leading-none">
                          —
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center min-w-0 border-x border-border/30 px-1">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
                          Winrate
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-muted-foreground/40 tabular-nums mt-0.5 leading-none">
                          —
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center min-w-0">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
                          Partidas
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-medium text-muted-foreground/40 tabular-nums mt-0.5 leading-none">
                          0 jogos
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              }
            })}
          </div>
        )}
      </SectionContainer>
    </div>
  );
}
