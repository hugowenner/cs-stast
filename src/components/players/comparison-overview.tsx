import { PlayerAvatar } from "@/components/players/player-avatar";
import { cn } from "@/lib/utils";
import type { PlayerComparisonDTO } from "@/server/dtos/playerComparison.dto";
import { Trophy, Check } from "lucide-react";

interface ComparisonOverviewProps {
  comparison: PlayerComparisonDTO;
}

export function ComparisonOverview({ comparison }: ComparisonOverviewProps) {
  const [pA, pB] = comparison.players;

  // Lista de métricas estruturadas
  const metricConfigs = [
    { key: "rating", label: "Rating", higherIsBetter: true },
    { key: "kd", label: "K/D", higherIsBetter: true },
    { key: "adr", label: "ADR", higherIsBetter: true },
    { key: "kast", label: "KAST", higherIsBetter: true },
    { key: "hsPercentage", label: "HS%", higherIsBetter: true },
    { key: "impact", label: "Impacto", higherIsBetter: true },
    { key: "winrate", label: "Taxa de Vitórias", higherIsBetter: true },
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

  // Determinar vantagem geral
  let winnerName = "";
  let winnerAvatar = null;
  let advantageReason = "";
  let winnerColor = "";

  if (winsA.length > winsB.length) {
    winnerName = pA.nickname;
    winnerAvatar = pA.avatarUrl;
    winnerColor = "text-primary border-primary/20 bg-primary/[0.01] shadow-[0_0_15px_rgba(var(--primary-rgb),0.02)]";
    const diff = pA.metrics.rating - pB.metrics.rating;
    advantageReason = diff > 0
      ? `Lidera em ${winsA.length} das ${metricConfigs.length} métricas comparadas, com +${Math.round(diff * 100)}% de eficiência de rating nesta temporada.`
      : `Lidera em ${winsA.length} das ${metricConfigs.length} categorias.`;
  } else if (winsB.length > winsA.length) {
    winnerName = pB.nickname;
    winnerAvatar = pB.avatarUrl;
    winnerColor = "text-accent-cyan border-accent-cyan/20 bg-accent-cyan/[0.01] shadow-[0_0_15px_rgba(var(--accent-cyan-rgb),0.02)]";
    const diff = pB.metrics.rating - pA.metrics.rating;
    advantageReason = diff > 0
      ? `Lidera em ${winsB.length} das ${metricConfigs.length} métricas comparadas, com +${Math.round(diff * 100)}% de eficiência de rating nesta temporada.`
      : `Lidera em ${winsB.length} das ${metricConfigs.length} categorias.`;
  } else {
    winnerName = "Empate Técnico";
    winnerColor = "text-white border-white/10 bg-white/[0.005]";
    advantageReason = "Ambos os jogadores venceram a mesma quantidade de categorias na temporada.";
  }

  return (
    <div className="glass-panel p-5 border border-white/[0.06] bg-white/[0.01] rounded-2xl flex flex-col gap-4 relative overflow-hidden">
      {/* Background Decorative */}
      <div className="absolute -left-20 -bottom-20 size-40 bg-white/[0.01] rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
        <Trophy className="size-4.5 text-status-warning shrink-0" />
        <h3 className="text-xs font-black text-white uppercase tracking-wider">
          Placar do Duelo Competitivo
        </h3>
      </div>

      {/* Grid: Player side-by-side scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vencedor A */}
        <div className="flex flex-col gap-2 p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl">
          <div className="flex items-center gap-2 border-b border-white/[0.03] pb-1.5">
            <PlayerAvatar nickname={pA.nickname} avatarUrl={pA.avatarUrl} size="sm" />
            <span className="text-xs font-black text-white">{pA.nickname} venceu:</span>
          </div>
          {winsA.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {winsA.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary uppercase"
                >
                  <Check className="size-2.5 shrink-0" />
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/40 italic py-1">
              Nenhuma categoria vencida.
            </p>
          )}
        </div>

        {/* Vencedor B */}
        <div className="flex flex-col gap-2 p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl">
          <div className="flex items-center gap-2 border-b border-white/[0.03] pb-1.5">
            <PlayerAvatar nickname={pB.nickname} avatarUrl={pB.avatarUrl} size="sm" />
            <span className="text-xs font-black text-white">{pB.nickname} venceu:</span>
          </div>
          {winsB.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {winsB.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan uppercase"
                >
                  <Check className="size-2.5 shrink-0" />
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/40 italic py-1">
              Nenhuma categoria vencida.
            </p>
          )}
        </div>
      </div>

      {/* Vantagem Recomendação Card */}
      <div className={cn("border rounded-xl p-3 flex flex-row items-center gap-3.5 mt-1", winnerColor)}>
        {winnerAvatar ? (
          <div className="shrink-0 ring-2 ring-white/[0.05] rounded-full overflow-hidden flex">
            <PlayerAvatar nickname={winnerName} avatarUrl={winnerAvatar} size="md" />
          </div>
        ) : (
          <div className="flex size-11 items-center justify-center rounded-full bg-white/[0.03] border border-white/[0.07] shrink-0 text-white font-black text-xs">
            🏆
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-wider opacity-60">
            Vantagem Tática
          </p>
          <h4 className="text-sm font-black text-white mt-0.5 leading-tight flex items-center gap-1 truncate">
            <span>{winnerName}</span>
            {winnerName !== "Empate Técnico" && <span className="text-[10px] opacity-70">está em vantagem</span>}
          </h4>
          <p className="text-[10px] text-muted-foreground/80 mt-1 leading-snug">
            {advantageReason}
          </p>
        </div>
      </div>
    </div>
  );
}
