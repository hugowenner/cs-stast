import { Trophy, AlertTriangle, Users, Gamepad2 } from "lucide-react";
import { TrendIndicator } from "./trend-indicator";

export interface CoachSummaryData {
  bestMap: { name: string; winrate: number } | null;
  worstMap: { name: string; winrate: number } | null;
  last10Winrate: { wins: number; losses: number; winrate: number } | null;
  ratingTrend: string; // e.g. "+0.14" ou "-0.05"
  favoritePartner: { nickname: string; matches: number } | null;
}

export function CoachSummaryCard({ data }: { data: CoachSummaryData }) {
  const isTrendPositive = !data.ratingTrend.startsWith("-");
  const trendBgClass = isTrendPositive ? "bg-status-good/10" : "bg-status-critical/10";

  return (
    <div className="glass-panel glow-ring-primary flex flex-col gap-4 p-5 border border-primary/20 bg-primary/[0.02]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
          🧠 Coach IA
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Baseline Beta
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Desempenho e Tendência */}
        <div className="flex items-start gap-3 rounded-lg bg-white/[0.02] p-3.5 border border-white/5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent-violet/15 text-accent-violet">
            <Gamepad2 className="size-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Forma Recente</p>
            {data.last10Winrate ? (
              <>
                <p className="text-sm font-bold mt-0.5">
                  {data.last10Winrate.wins}V - {data.last10Winrate.losses}D
                </p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Winrate de {data.last10Winrate.winrate}%
                </p>
              </>
            ) : (
              <p className="text-sm font-bold mt-0.5">—</p>
            )}
          </div>
        </div>

        {/* Tendência de Rating */}
        <div className="flex items-start gap-3 rounded-lg bg-white/[0.02] p-3.5 border border-white/5">
          <div className={`flex size-9 items-center justify-center rounded-lg ${trendBgClass} shrink-0`}>
            <TrendIndicator value={data.ratingTrend} />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Tendência de Rating</p>
            <p className="text-sm font-bold mt-0.5">
              <TrendIndicator value={data.ratingTrend} />
            </p>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Últimos 5 vs 5 anteriores
            </p>
          </div>
        </div>

        {/* Melhor Mapa */}
        <div className="flex items-start gap-3 rounded-lg bg-white/[0.02] p-3.5 border border-white/5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-status-good/15 text-status-good">
            <Trophy className="size-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Melhor Mapa</p>
            {data.bestMap ? (
              <>
                <p className="text-sm font-bold mt-0.5">{data.bestMap.name}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  {data.bestMap.winrate.toFixed(1)}% winrate
                </p>
              </>
            ) : (
              <p className="text-sm font-bold mt-0.5">—</p>
            )}
          </div>
        </div>

        {/* Pior Mapa */}
        <div className="flex items-start gap-3 rounded-lg bg-white/[0.02] p-3.5 border border-white/5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-status-critical/15 text-status-critical">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Pior Mapa</p>
            {data.worstMap ? (
              <>
                <p className="text-sm font-bold mt-0.5">{data.worstMap.name}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  {data.worstMap.winrate.toFixed(1)}% winrate
                </p>
              </>
            ) : (
              <p className="text-sm font-bold mt-0.5">—</p>
            )}
          </div>
        </div>

        {/* Parceiro Favorito */}
        <div className="flex items-start gap-3 rounded-lg bg-white/[0.02] p-3.5 border border-white/5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent-cyan/15 text-accent-cyan">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">Principal Parceria</p>
            {data.favoritePartner ? (
              <>
                <p className="text-sm font-bold mt-0.5">{data.favoritePartner.nickname}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  {data.favoritePartner.matches} partidas juntos
                </p>
              </>
            ) : (
              <p className="text-sm font-bold mt-0.5">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
