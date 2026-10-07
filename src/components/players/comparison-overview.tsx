import * as React from "react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { cn } from "@/lib/utils";
import type { PlayerComparisonDTO } from "@/server/dtos/playerComparison.dto";
import { Trophy, Check, Swords, Flame, ShieldAlert } from "lucide-react";

export interface ComparisonOverviewProps {
  comparison: PlayerComparisonDTO;
}

export function ComparisonOverview({ comparison }: ComparisonOverviewProps) {
  const [pA, pB] = comparison.players;

  const metricConfigs = [
    { key: "rating",       label: "Rating 2.0" },
    { key: "kd",           label: "K/D Ratio" },
    { key: "adr",          label: "ADR" },
    { key: "kast",         label: "KAST%" },
    { key: "hsPercentage", label: "HS%" },
    { key: "impact",       label: "Impacto" },
    { key: "winrate",      label: "Winrate" },
  ] as const;

  const winsA: string[] = [];
  const winsB: string[] = [];

  metricConfigs.forEach((cfg) => {
    const valA = pA.metrics[cfg.key as keyof typeof pA.metrics];
    const valB = pB.metrics[cfg.key as keyof typeof pB.metrics];
    if (valA > valB) {
      winsA.push(cfg.label);
    } else if (valB > valA) {
      winsB.push(cfg.label);
    }
  });

  let winnerName = "";
  let winnerAvatar: string | null = null;
  let advantageReason = "";
  let advantageVariant: "primary" | "info" | "neutral" = "neutral";

  if (winsA.length > winsB.length) {
    winnerName = pA.nickname;
    winnerAvatar = pA.avatarUrl;
    advantageVariant = "primary";
    const diff = pA.metrics.rating - pB.metrics.rating;
    advantageReason =
      diff > 0
        ? `Lidera em ${winsA.length} das ${metricConfigs.length} categorias avaliadas, com vantagem de +${diff.toFixed(2)} em Rating 2.0.`
        : `Lidera em ${winsA.length} das ${metricConfigs.length} categorias.`;
  } else if (winsB.length > winsA.length) {
    winnerName = pB.nickname;
    winnerAvatar = pB.avatarUrl;
    advantageVariant = "info";
    const diff = pB.metrics.rating - pA.metrics.rating;
    advantageReason =
      diff > 0
        ? `Lidera em ${winsB.length} das ${metricConfigs.length} categorias avaliadas, com vantagem de +${diff.toFixed(2)} em Rating 2.0.`
        : `Lidera em ${winsB.length} das ${metricConfigs.length} categorias.`;
  } else {
    winnerName = "Equilíbrio Estatístico";
    advantageVariant = "neutral";
    advantageReason = "Ambos os jogadores venceram a mesma quantidade de categorias no período selecionado.";
  }

  return (
    <div className="bg-surface-panel border border-border/70 rounded-sm overflow-hidden flex flex-col shadow-md">
      {/* Top Header */}
      <div className="px-5 py-3.5 border-b border-border/40 bg-surface-deck/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="size-4 text-primary" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            Placar do Duelo Competitivo
          </span>
        </div>
        <TacticalBadge
          label={winnerName === "Equilíbrio Estatístico" ? "EMPATE" : "VANTAGEM DEFINIDA"}
          variant={winnerName === "Equilíbrio Estatístico" ? "neutral" : "good"}
          size="xs"
        />
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Symmetric Scorecard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Player A Scorecard */}
          <div className="p-4 bg-surface-deck border border-border/50 rounded-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <PlayerAvatar nickname={pA.nickname} avatarUrl={pA.avatarUrl} size="sm" />
                <span className="text-sm font-bold text-foreground truncate">{pA.nickname}</span>
              </div>
              <span className="font-mono text-xs font-bold text-primary">
                {winsA.length} vitórias
              </span>
            </div>

            {winsA.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {winsA.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold bg-primary/10 border border-primary/25 text-primary uppercase"
                  >
                    <Check className="size-2.5" />
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-mono text-muted-foreground/50 py-1">
                Nenhuma categoria superada no confronto.
              </p>
            )}
          </div>

          {/* Player B Scorecard */}
          <div className="p-4 bg-surface-deck border border-border/50 rounded-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <PlayerAvatar nickname={pB.nickname} avatarUrl={pB.avatarUrl} size="sm" />
                <span className="text-sm font-bold text-foreground truncate">{pB.nickname}</span>
              </div>
              <span className="font-mono text-xs font-bold text-cyan-400">
                {winsB.length} vitórias
              </span>
            </div>

            {winsB.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {winsB.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 uppercase"
                  >
                    <Check className="size-2.5" />
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-mono text-muted-foreground/50 py-1">
                Nenhuma categoria superada no confronto.
              </p>
            )}
          </div>

        </div>

        {/* Tactical Advantage Banner */}
        <div
          className={cn(
            "p-4 rounded-xs border flex items-center gap-3.5",
            advantageVariant === "primary"
              ? "bg-primary/[0.04] border-primary/30"
              : advantageVariant === "info"
                ? "bg-cyan-500/[0.04] border-cyan-500/30"
                : "bg-surface-deck border-border/60"
          )}
        >
          {winnerAvatar ? (
            <PlayerAvatar nickname={winnerName} avatarUrl={winnerAvatar} size="md" />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-xs bg-surface-elevated border border-border/60 text-primary shrink-0">
              <Swords className="size-4" />
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70">
                VANTAGEM TÁTICA
              </span>
              <TacticalBadge
                label={winnerName === "Equilíbrio Estatístico" ? "EQUILÍBRIO" : "SUPERIOR"}
                variant={advantageVariant === "primary" ? "primary" : advantageVariant === "info" ? "info" : "neutral"}
                size="xs"
              />
            </div>
            <span className="text-sm font-black text-foreground mt-0.5 truncate">
              {winnerName}
            </span>
            <p className="text-xs text-muted-foreground/80 font-sans mt-0.5 leading-snug">
              {advantageReason}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
