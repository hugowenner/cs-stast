"use client";

import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { MapSpecialist } from "@/server/services/competitive.service";
import { Map, Crown } from "lucide-react";

interface Props {
  specialists: MapSpecialist[];
}

export function MapSpecialistsGrid({ specialists }: Props) {
  if (specialists.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-white/[0.06] p-8 text-center">
        <Map className="size-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground/50">Nenhum especialista de mapa identificado ainda.</p>
      </div>
    );
  }

  const WILSON_TOOLTIP =
    "A classificação equilibra percentual de vitórias e quantidade de partidas usando o limite inferior de Wilson com 95% de confiança. Históricos maiores reduzem a incerteza. Por isso, o maior percentual exibido nem sempre ocupa o primeiro lugar.";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {specialists.map((entry) => {
        const mapKey = entry.mapId ?? entry.mapName;
        const displayName = entry.cleanMapName || entry.mapName;

        if (!entry.player) {
          return (
            <div
              key={mapKey}
              className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Nome do mapa */}
                <div className="px-3 pt-3 pb-2 border-b border-white/[0.05]">
                  <div className="flex items-center gap-1.5">
                    <Map className="size-2.5 text-accent-cyan/70 shrink-0" />
                    <p className="text-[9px] font-black text-accent-cyan uppercase tracking-widest truncate">
                      {displayName}
                    </p>
                  </div>
                </div>

                {/* Mensagem quando player for null */}
                <div className="px-3 py-3 flex flex-col justify-center border-b border-white/[0.04]">
                  <p className="text-[11px] font-bold text-muted-foreground/80">
                    Nenhum jogador elegível
                  </p>
                  <p className="text-[9px] text-muted-foreground/50 leading-relaxed mt-1">
                    É necessário disputar pelo menos 5 partidas e conquistar 1 vitória neste mapa.
                  </p>
                </div>
              </div>

              {/* Rodapé informativo */}
              <div className="px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p
                    className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/40 cursor-help"
                    title={WILSON_TOOLTIP}
                  >
                    Mínimo: 5 partidas
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground/40 mt-0.5">
                    Sem líder consolidado
                  </p>
                </div>
              </div>
            </div>
          );
        }

        const player = entry.player;

        return (
          <div
            key={mapKey}
            className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col justify-between"
          >
            <div>
              {/* Nome do mapa + Identificação de Ranking Ajustado */}
              <div className="px-3 pt-3 pb-2 border-b border-white/[0.05] flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Map className="size-2.5 text-accent-cyan/70 shrink-0" />
                  <p className="text-[9px] font-black text-accent-cyan uppercase tracking-widest truncate">
                    {displayName}
                  </p>
                </div>
                <span
                  className="text-[7px] font-mono text-muted-foreground/60 uppercase tracking-wider cursor-help shrink-0"
                  title={WILSON_TOOLTIP}
                >
                  Ajustado
                </span>
              </div>

              {/* 1º Colocado (Destaque por aproveitamento) */}
              <div className="px-3 py-2.5 flex items-center gap-2 border-b border-white/[0.04]">
                <PlayerAvatar
                  nickname={player.nickname}
                  avatarUrl={player.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[9px] font-mono font-bold text-gold shrink-0">#1</span>
                      <Link
                        href={`/players/${player.id}`}
                        className="text-[11px] font-black text-white hover:text-accent-cyan transition-colors truncate"
                      >
                        {player.nickname}
                      </Link>
                      <Crown className="size-3 text-gold shrink-0" aria-label="1º lugar (Destaque por aproveitamento)" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-1 mt-0.5">
                    <p className="text-[11px] font-mono font-black text-status-good tabular-nums">
                      {entry.winrate.toFixed(0)}%
                    </p>
                    <p
                      className="text-[8px] font-mono text-muted-foreground/70 tabular-nums cursor-help"
                      title={
                        entry.wilsonScore !== null && entry.wilsonScore !== undefined
                          ? `Índice para classificação: ${(entry.wilsonScore * 100).toFixed(1)}`
                          : undefined
                      }
                    >
                      {entry.wins} vitórias em {entry.matches} partidas
                    </p>
                  </div>
                </div>
              </div>

              {/* 2º e 3º Colocados (Linhas Compactas) */}
              {entry.podium && entry.podium.length > 1 && (
                <div className="px-3 py-2 border-b border-white/[0.04] flex flex-col gap-1.5">
                  {entry.podium.slice(1).map((runnerUp, idx) => {
                    const pos = idx + 2;
                    return (
                      <div
                        key={runnerUp.player.id}
                        className="flex items-center justify-between gap-1.5 text-[9px] font-mono"
                        title={`Rating no mapa: ${runnerUp.rating.toFixed(2)}${
                          runnerUp.wilsonScore !== undefined
                            ? ` • Índice para classificação: ${(runnerUp.wilsonScore * 100).toFixed(1)}`
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[8px] font-bold text-muted-foreground/60 shrink-0">
                            #{pos}
                          </span>
                          <PlayerAvatar
                            nickname={runnerUp.player.nickname}
                            avatarUrl={runnerUp.player.avatarUrl}
                            size="xs"
                          />
                          <Link
                            href={`/players/${runnerUp.player.id}`}
                            className="font-medium text-white/90 hover:text-accent-cyan transition-colors truncate leading-tight max-w-[80px] sm:max-w-[100px]"
                          >
                            {runnerUp.player.nickname}
                          </Link>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 tabular-nums text-muted-foreground/70">
                          <span className="font-bold text-white/90">{runnerUp.winrate.toFixed(0)}%</span>
                          <span>·</span>
                          <span
                            title={
                              runnerUp.wilsonScore !== undefined
                                ? `Índice para classificação: ${(runnerUp.wilsonScore * 100).toFixed(1)}`
                                : undefined
                            }
                          >
                            {runnerUp.wins}V/{runnerUp.matches}P
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rating no mapa do líder + Requisito do mapa */}
            <div className="px-3 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">Rating no Mapa (#1)</p>
                <p className="text-sm font-black text-white/90 tabular-nums mt-0.5">
                  {entry.rating !== null ? (
                    <AnimatedNumber value={entry.rating} decimals={2} duration={0.7} />
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <span
                className="text-[8px] font-mono text-muted-foreground/50 cursor-help underline decoration-dotted decoration-muted-foreground/30"
                title={WILSON_TOOLTIP}
              >
                Mínimo: 5 partidas
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
