import { SectionContainer } from "@/components/dashboard/section-container";
import { PageHeader } from "@/components/ui/page-header";
import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { FORMA_STYLE } from "@/lib/forma";
import { Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { safeQuery } from "@/server/safeQuery";
import * as playerService from "@/server/services/player.service";
import * as competitiveService from "@/server/services/competitive.service";

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
        <PageHeader title="👥 Jogadores" subtitle="Roster oficial e painel de scouting na temporada" />
      </FadeIn>

      <SectionContainer
        title="Painel de Scouting"
        subtitle={`${players.length} jogadores monitorados ativos`}
        delay={0.05}
      >
        {sortedPlayers.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-white/[0.06] p-12 text-center">
            <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground/50">Nenhum jogador monitorado sincronizado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedPlayers.map((player) => {
              const entry = monitoredByPlayerId.get(player.id);

              if (entry) {
                // Jogador ativo com estatísticas calculadas na temporada
                const forma = FORMA_STYLE[entry.forma] ?? FORMA_STYLE["Oscilando"];
                const FormaIcon = forma.icon;
                const rankGlow =
                  entry.rank === 1 ? "border-status-warning/45 shadow-[0_0_15px_0_rgba(245,158,11,0.08)]" :
                  entry.rank === 2 ? "border-white/20" :
                  entry.rank === 3 ? "border-accent-violet/30" :
                  "border-white/[0.08]";

                return (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className={`glass-panel card-hover rounded-2xl border overflow-hidden flex flex-col group ${rankGlow}`}
                  >
                    {/* Cabeçalho do Card */}
                    <div className="px-4 pt-4 pb-3 border-b border-white/[0.05] flex items-center gap-3">
                      <div className="relative shrink-0">
                        <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} size="md" />
                        <span className={`absolute -bottom-1 -right-1 text-[8px] font-black leading-none px-1 py-0.5 rounded-full border ${
                          entry.rank === 1 ? "bg-status-warning text-black border-status-warning/50" :
                          entry.rank === 2 ? "bg-white/15 text-white border-white/20" :
                          entry.rank === 3 ? "bg-accent-violet/20 text-accent-violet border-accent-violet/30" :
                          "bg-white/[0.06] text-muted-foreground/70 border-white/[0.08]"
                        }`}>
                          #{entry.rank}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-white truncate leading-snug">{player.nickname}</p>
                        {player.levelGc && (
                          <p className="text-[9px] text-muted-foreground/55 font-semibold mt-0.5">GC Nível {player.levelGc}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${forma.bg} ${forma.border} ${forma.color}`}>
                          <FormaIcon className="size-2.5" />
                          {forma.text}
                        </span>
                      </div>
                    </div>

                    {/* Métricas Rápidas: Rating e Winrate */}
                    <div className="px-4 py-4.5 grid grid-cols-2 gap-4 border-b border-white/[0.04] bg-white/[0.01]">
                      <div className="text-center border-r border-white/[0.04]">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">Rating</p>
                        <p className="text-xl font-black text-white mt-1.5 tabular-nums">
                          <AnimatedNumber value={entry.rating} decimals={2} duration={0.8} />
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">Winrate</p>
                        <p className="text-xl font-black text-white mt-1.5 tabular-nums">
                          <AnimatedNumber value={entry.winrate} decimals={0} suffix="%" duration={0.6} />
                        </p>
                      </div>
                    </div>

                    {/* Botão de Ação CTA */}
                    <div className="mt-auto px-4 pb-4 pt-3.5">
                      <div className="w-full py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.07] text-center text-xs font-bold text-white/90 flex items-center justify-center gap-1 transition-all duration-300 group-hover:bg-primary group-hover:text-black group-hover:border-primary">
                        Ver perfil <ArrowRight className="size-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
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
                    className="glass-panel card-hover rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col p-6 text-center items-center justify-between gap-4 min-h-[220px] group"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} size="md" />
                      <div className="min-w-0">
                        <p className="text-base font-black text-white truncate leading-snug">{player.nickname}</p>
                        {player.levelGc ? (
                          <p className="text-xs text-muted-foreground/50 font-semibold mt-1">GC Nível {player.levelGc}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground/45 font-semibold mt-1">Nível GC não disponível</p>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground/50 leading-relaxed italic max-w-[200px]">
                      "Sem dados suficientes nesta temporada"
                    </p>

                    <div className="w-full pt-2 mt-auto">
                      <div className="w-full py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.07] text-center text-xs font-bold text-white/90 flex items-center justify-center gap-1 transition-all duration-300 group-hover:bg-primary group-hover:text-black group-hover:border-primary">
                        Ver perfil <ArrowRight className="size-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
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
