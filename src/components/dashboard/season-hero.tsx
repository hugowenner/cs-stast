import { Trophy, TrendingUp, Compass, Award } from "lucide-react";

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
  return (
    <div className="glass-panel glow-ring relative overflow-hidden rounded-2xl border border-white/10 p-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between bg-gradient-to-r from-white/[0.01] to-white/[0.03]">
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-violet/20 text-accent-violet">
          <Trophy className="size-6" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Temporada Atual
          </p>
          <h1 className="text-xl font-bold text-white capitalize">🏆 {seasonLabel}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{totalMatches} partidas analisadas</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 divide-x divide-white/5">
        {/* Melhor Jogador (MVP) */}
        <div className="text-center sm:text-right px-2 first:pl-0 sm:px-4">
          <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            <Award className="size-3 text-status-warning" />
            MVP
          </div>
          <p className="text-base sm:text-lg font-bold text-white truncate max-w-[120px] sm:max-w-none mt-1">
            {bestPlayer?.nickname ?? "N/A"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {bestPlayer?.rating ? `${bestPlayer.rating.toFixed(2)} Rating` : "Sem dados"}
          </p>
        </div>

        {/* Winrate Geral */}
        <div className="text-center sm:text-right px-2 sm:px-4">
          <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            <TrendingUp className="size-3 text-accent-cyan" />
            Winrate Geral
          </div>
          <p className="text-base sm:text-lg font-black text-white mt-1">
            {communityWinrate}%
          </p>
          <p className="text-[10px] text-muted-foreground">da comunidade</p>
        </div>

        {/* Mapa Dominante */}
        <div className="text-center sm:text-right px-2 sm:px-4">
          <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            <Compass className="size-3 text-accent-violet" />
            Dominante
          </div>
          <p className="text-base sm:text-lg font-bold text-white truncate max-w-[120px] sm:max-w-none mt-1">
            {dominantMap?.name ?? "N/A"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {dominantMap?.percentage ? `${dominantMap.percentage}% jogos` : "Sem dados"}
          </p>
        </div>
      </div>
    </div>
  );
}
