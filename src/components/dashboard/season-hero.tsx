import { Trophy, Award, TrendingUp, Compass } from "lucide-react";

export function SeasonHero({
  seasonLabel,
  totalMatches,
  bestPlayer,
  communityWinrate,
  dominantMap,
}: {
  seasonLabel: string;
  totalMatches: number;
  bestPlayer: { nickname: string; rating: number } | null;
  communityWinrate: number;
  dominantMap: { name: string; percentage: number } | null;
}) {
  // "julho de 2026" → "Julho 2026"
  const label = seasonLabel.replace(" de ", " ").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl border border-white/[0.07] px-5 py-4">
      {/* Linha 1: header compacto */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <Trophy className="size-3.5 shrink-0 text-accent-violet" />
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/55">
            Season 1 · {label}
          </p>
        </div>
        <p className="text-[9px] tabular-nums text-muted-foreground/40">
          {totalMatches} partidas
        </p>
      </div>

      {/* Linha 2: MVP (protagonista) + métricas secundárias */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* MVP */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-status-warning/12">
            <Award className="size-4 text-status-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50 leading-none mb-1">
              MVP da Temporada
            </p>
            <p className="text-xl font-black text-white leading-none truncate">
              {bestPlayer?.nickname ?? "—"}
            </p>
            <p className="text-[10px] font-bold text-status-warning/80 tabular-nums mt-1 leading-none">
              {bestPlayer ? `${bestPlayer.rating.toFixed(2)} Rating` : "Sem dados"}
            </p>
          </div>
        </div>

        {/* Métricas secundárias */}
        <div className="flex items-center gap-5 sm:gap-6 shrink-0 pl-0 sm:pl-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <TrendingUp className="size-2.5 text-accent-cyan shrink-0" />
              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50 leading-none">
                Winrate
              </p>
            </div>
            <p className="text-lg font-black text-white tabular-nums leading-none">
              {communityWinrate}%
            </p>
          </div>

          <div className="h-7 w-px bg-white/[0.06] shrink-0" />

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <Compass className="size-2.5 text-accent-violet shrink-0" />
              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50 leading-none">
                Mapa Favorito
              </p>
            </div>
            <p className="text-base font-black text-white leading-none truncate">
              {dominantMap?.name ?? "—"}
            </p>
            {dominantMap?.percentage != null && (
              <p className="text-[9px] text-muted-foreground/45 tabular-nums leading-none">
                {dominantMap.percentage}%
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
