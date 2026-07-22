import { Trophy } from "lucide-react";

export function SeasonHero({
  seasonLabel,
  totalMatches,
  totalPlayers,
  totalSessions,
}: {
  seasonLabel: string;
  totalMatches: number;
  totalPlayers: number;
  totalSessions: number;
}) {
  return (
    <div className="glass-panel glow-ring relative overflow-hidden rounded-2xl border border-white/10 p-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-violet/20 text-accent-violet">
          <Trophy className="size-6" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Temporada
          </p>
          <h1 className="text-xl font-bold text-white">🏆 {seasonLabel}</h1>
        </div>
      </div>

      <div className="flex items-center gap-6 sm:gap-8">
        <SeasonStat value={totalMatches} label="partidas analisadas" />
        <SeasonStat value={totalPlayers} label="jogadores" />
        <SeasonStat value={totalSessions} label="sessões" />
      </div>
    </div>
  );
}

function SeasonStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-right">
      <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
      <p className="text-[11px] text-muted-foreground whitespace-nowrap">{label}</p>
    </div>
  );
}
