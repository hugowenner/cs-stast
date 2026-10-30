"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  AlertTriangle,
  UserCheck,
  ChevronDown,
  Info,
} from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge, type TacticalBadgeVariant } from "@/components/ui/tactical-badge";
import { RaioXCardFrame } from "./raio-x-card-frame";
import type {
  PartnersRankings,
  DuoPartnership,
} from "@/lib/raio-x-types";
import { cn } from "@/lib/utils";

interface ParceirosCardProps {
  rankings: PartnersRankings;
}

type MainViewMode = "geral" | "por_jogador";
type GeneralRankingTab = "mais_ganha" | "mais_perde" | "melhor_aproveitamento" | "pior_aproveitamento";

export function ParceirosCard({ rankings }: ParceirosCardProps) {
  const {
    minMatchesThreshold,
    totalEligibleDuos,
    mostWinsDuo,
    mostLossesDuo,
    bestWinrateDuo,
    worstWinrateDuo,
    playersMap,
    monitoredPlayers,
  } = rankings;

  const [viewMode, setViewMode] = useState<MainViewMode>("geral");
  const [generalTab, setGeneralTab] = useState<GeneralRankingTab>("melhor_aproveitamento");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    monitoredPlayers[0]?.id ?? "",
  );

  const selectedPlayerSummary = selectedPlayerId ? playersMap[selectedPlayerId] : null;

  return (
    <RaioXCardFrame
      moduleNumber="#09"
      title="Parceiros de Vitória e Derrota"
      description="Desempenho observado quando jogam juntos no mesmo time comunitário."
      icon={Users}
      iconClass="bg-primary/10 text-primary border-primary/20"
      categoryBadge={<TacticalBadge label="SINERGIA" variant="neutral" size="xs" />}
      statusBadge={
        <TacticalBadge
          label={`MÍN. ${minMatchesThreshold} JOGOS JUNTOS`}
          variant="primary"
          size="xs"
        />
      }
      headerAction={
        <div className="flex items-center gap-1 bg-surface-deck border border-border/40 p-0.5 rounded-xs">
          <button
            type="button"
            onClick={() => setViewMode("geral")}
            className={cn(
              "px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-xs transition-micro cursor-pointer",
              viewMode === "geral"
                ? "bg-primary text-primary-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Top Duplas
          </button>
          <button
            type="button"
            onClick={() => setViewMode("por_jogador")}
            className={cn(
              "px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-xs transition-micro flex items-center gap-1 cursor-pointer",
              viewMode === "por_jogador"
                ? "bg-primary text-primary-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UserCheck className="size-3" />
            <span>Por Jogador</span>
          </button>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span>Partidas atuando no mesmo time comunitário</span>
          <span className="flex items-center gap-1">
            <Info className="size-2.5" />
            Amostra mínima de {minMatchesThreshold} jogos juntos
          </span>
        </div>
      }
    >
      {/* Conteúdo Principal */}
      {totalEligibleDuos === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-surface-deck/40 border border-dashed border-border/40 rounded-xs my-auto">
          <AlertTriangle className="size-6 text-muted-foreground/40 mb-2" />
          <p className="text-xs font-mono font-bold text-foreground">
            Amostra Insuficiente
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/60 max-w-sm mt-1">
            Nenhuma dupla atingiu o critério de pelo menos {minMatchesThreshold} partidas no mesmo time neste período.
          </p>
        </div>
      ) : viewMode === "geral" ? (
        /* ═══ MODO GERAL (TOP DUPLAS) ═══ */
        <div className="flex flex-col gap-3">
          {/* Abas das 4 Visões Independentes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setGeneralTab("melhor_aproveitamento")}
              className={cn(
                "p-1.5 text-left rounded-xs border transition-micro",
                generalTab === "melhor_aproveitamento"
                  ? "bg-surface-deck border-status-good/50 text-foreground"
                  : "bg-surface-deck/40 border-border/20 text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-status-good block">
                Melhor Winrate
              </span>
              <span className="text-xs font-mono font-bold block tabular-nums mt-0.5">
                {bestWinrateDuo ? `${bestWinrateDuo.winrate}%` : "—"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setGeneralTab("mais_ganha")}
              className={cn(
                "p-1.5 text-left rounded-xs border transition-micro",
                generalTab === "mais_ganha"
                  ? "bg-surface-deck border-primary/50 text-foreground"
                  : "bg-surface-deck/40 border-border/20 text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-primary block">
                Mais Vitórias
              </span>
              <span className="text-xs font-mono font-bold block tabular-nums mt-0.5">
                {mostWinsDuo ? `${mostWinsDuo.wins}V` : "—"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setGeneralTab("pior_aproveitamento")}
              className={cn(
                "p-1.5 text-left rounded-xs border transition-micro",
                generalTab === "pior_aproveitamento"
                  ? "bg-surface-deck border-status-danger/50 text-foreground"
                  : "bg-surface-deck/40 border-border/20 text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-status-danger block">
                Pior Winrate
              </span>
              <span className="text-xs font-mono font-bold block tabular-nums mt-0.5">
                {worstWinrateDuo ? `${worstWinrateDuo.winrate}%` : "—"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setGeneralTab("mais_perde")}
              className={cn(
                "p-1.5 text-left rounded-xs border transition-micro",
                generalTab === "mais_perde"
                  ? "bg-surface-deck border-amber-500/50 text-foreground"
                  : "bg-surface-deck/40 border-border/20 text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                Mais Derrotas
              </span>
              <span className="text-xs font-mono font-bold block tabular-nums mt-0.5">
                {mostLossesDuo ? `${mostLossesDuo.losses}D` : "—"}
              </span>
            </button>
          </div>

          {/* Card Detalhado da Dupla Selecionada */}
          {generalTab === "melhor_aproveitamento" && bestWinrateDuo && (
            <DuoDetailBlock
              duo={bestWinrateDuo}
              title="Maior Aproveitamento Coletivo"
              badge="MELHOR WINRATE"
              badgeVariant="good"
              accentColor="text-status-good"
              mainMetric={`${bestWinrateDuo.winrate}%`}
              mainMetricLabel="taxa de vitória"
            />
          )}

          {generalTab === "mais_ganha" && mostWinsDuo && (
            <DuoDetailBlock
              duo={mostWinsDuo}
              title="Maior Volume Absoluto de Vitórias"
              badge="MAIS VITÓRIAS"
              badgeVariant="primary"
              accentColor="text-primary"
              mainMetric={`${mostWinsDuo.wins}`}
              mainMetricLabel={`vitórias em ${mostWinsDuo.total} jogos (${mostWinsDuo.winrate}%)`}
            />
          )}

          {generalTab === "pior_aproveitamento" && worstWinrateDuo && (
            <DuoDetailBlock
              duo={worstWinrateDuo}
              title="Menor Aproveitamento Coletivo"
              badge="PIOR WINRATE"
              badgeVariant="warning"
              accentColor="text-status-danger"
              mainMetric={`${worstWinrateDuo.winrate}%`}
              mainMetricLabel={`taxa de vitória (${worstWinrateDuo.losses} derrotas)`}
            />
          )}

          {generalTab === "mais_perde" && mostLossesDuo && (
            <DuoDetailBlock
              duo={mostLossesDuo}
              title="Maior Volume Absoluto de Derrotas"
              badge="MAIS DERROTAS"
              badgeVariant="warning"
              accentColor="text-amber-400"
              mainMetric={`${mostLossesDuo.losses}`}
              mainMetricLabel={`derrotas em ${mostLossesDuo.total} jogos (${mostLossesDuo.lossRate}% derrotas)`}
            />
          )}
        </div>
      ) : (
        /* ═══ MODO POR JOGADOR ═══ */
        <div className="flex flex-col gap-3">
          {/* Seletor de Jogador */}
          <div className="flex items-center justify-between gap-2 bg-surface-deck/80 border border-border/30 p-2 rounded-xs">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 shrink-0">
              Jogador:
            </span>
            <div className="relative flex-1">
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full bg-background border border-border/40 text-xs font-mono font-bold text-foreground py-1 px-2.5 rounded-xs appearance-none pr-8 cursor-pointer focus:outline-hidden focus:border-primary"
              >
                {monitoredPlayers.map((p) => {
                  const summary = playersMap[p.id];
                  const count = summary?.totalPartnersCount ?? 0;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nickname} ({count} parceiro{count === 1 ? "" : "s"} elegíveis)
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="size-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Dados do Jogador Selecionado */}
          {!selectedPlayerSummary || selectedPlayerSummary.totalPartnersCount === 0 ? (
            <div className="p-4 text-center bg-surface-deck/40 border border-border/20 rounded-xs">
              <p className="text-xs font-mono text-muted-foreground">
                Nenhum parceiro com pelo menos {minMatchesThreshold} partidas no mesmo time para este jogador.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {/* Destaques: Melhor e Pior Parceiro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Melhor Aproveitamento */}
                {selectedPlayerSummary.bestWinrate && (
                  <div className="p-2.5 bg-surface-deck border border-status-good/30 rounded-xs flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-status-good">
                        Melhor Aproveitamento
                      </span>
                      <span className="font-mono text-xs font-bold text-status-good tabular-nums">
                        {selectedPlayerSummary.bestWinrate.winrate}% WR
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <PlayerAvatar
                        nickname={selectedPlayerSummary.bestWinrate.partner.nickname}
                        avatarUrl={selectedPlayerSummary.bestWinrate.partner.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/players/${selectedPlayerSummary.bestWinrate.partner.id}`}
                          className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate block"
                        >
                          {selectedPlayerSummary.bestWinrate.partner.nickname}
                        </Link>
                        <span className="text-[10px] font-mono text-muted-foreground/60 block">
                          {selectedPlayerSummary.bestWinrate.wins}V - {selectedPlayerSummary.bestWinrate.losses}D em {selectedPlayerSummary.bestWinrate.total} jogos
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pior Aproveitamento */}
                {selectedPlayerSummary.worstWinrate && (
                  <div className="p-2.5 bg-surface-deck border border-status-danger/30 rounded-xs flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-status-danger">
                        Pior Aproveitamento
                      </span>
                      <span className="font-mono text-xs font-bold text-status-danger tabular-nums">
                        {selectedPlayerSummary.worstWinrate.winrate}% WR
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <PlayerAvatar
                        nickname={selectedPlayerSummary.worstWinrate.partner.nickname}
                        avatarUrl={selectedPlayerSummary.worstWinrate.partner.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/players/${selectedPlayerSummary.worstWinrate.partner.id}`}
                          className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate block"
                        >
                          {selectedPlayerSummary.worstWinrate.partner.nickname}
                        </Link>
                        <span className="text-[10px] font-mono text-muted-foreground/60 block">
                          {selectedPlayerSummary.worstWinrate.wins}V - {selectedPlayerSummary.worstWinrate.losses}D em {selectedPlayerSummary.worstWinrate.total} jogos
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista dos demais parceiros elegíveis */}
              {selectedPlayerSummary.allPartners.length > 2 && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-border/20">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/50">
                    Todos os parceiros elegíveis ({selectedPlayerSummary.allPartners.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPlayerSummary.allPartners.map((pt) => (
                      <div
                        key={pt.partner.id}
                        className="p-1.5 bg-surface-deck/40 border border-border/20 rounded-xs flex items-center gap-2 text-xs"
                      >
                        <PlayerAvatar
                          nickname={pt.partner.nickname}
                          avatarUrl={pt.partner.avatarUrl}
                          size="xs"
                        />
                        <span className="font-medium text-[11px] text-foreground">
                          {pt.partner.nickname}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[10px] font-bold tabular-nums",
                            pt.winrate >= 50 ? "text-status-good" : "text-status-danger",
                          )}
                        >
                          {pt.winrate}% ({pt.wins}V/{pt.total}J)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </RaioXCardFrame>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Bloco de Detalhe de Dupla (Visão Geral)
// ────────────────────────────────────────────────────────────────────────────

function DuoDetailBlock({
  duo,
  badge,
  badgeVariant,
  accentColor,
  mainMetric,
  mainMetricLabel,
}: {
  duo: DuoPartnership;
  title?: string;
  badge: string;
  badgeVariant: TacticalBadgeVariant;
  accentColor: string;
  mainMetric: string;
  mainMetricLabel: string;
}) {
  return (
    <div className="p-3.5 bg-surface-deck border border-border/40 rounded-xs flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <TacticalBadge label={badge} variant={badgeVariant} size="xs" />
        <span className="text-[10px] font-mono text-muted-foreground/60">
          {duo.total} partidas juntos
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Avatares e Nomes */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex -space-x-2 shrink-0">
            <PlayerAvatar nickname={duo.playerA.nickname} avatarUrl={duo.playerA.avatarUrl} size="sm" />
            <PlayerAvatar nickname={duo.playerB.nickname} avatarUrl={duo.playerB.avatarUrl} size="sm" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-foreground uppercase tracking-tight truncate">
              <Link href={`/players/${duo.playerA.id}`} className="hover:text-primary transition-micro">
                {duo.playerA.nickname}
              </Link>
              {" + "}
              <Link href={`/players/${duo.playerB.id}`} className="hover:text-primary transition-micro">
                {duo.playerB.nickname}
              </Link>
            </p>
            <span className="text-[10px] font-mono text-muted-foreground/70 block mt-0.5">
              {duo.wins} Vitórias · {duo.losses} Derrotas {duo.ties > 0 ? `· ${duo.ties} Empates` : ""}
            </span>
          </div>
        </div>

        {/* Métrica Principal */}
        <div className="text-right shrink-0">
          <span className={cn("font-mono text-xl font-black tabular-nums block", accentColor)}>
            {mainMetric}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/60 block">
            {mainMetricLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
