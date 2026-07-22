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

      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-8">
        <SeasonStat value={totalMatches} label="Partidas" />
        <SeasonStat value={totalPlayers} label="Jogadores" />
        <SeasonStat value={totalSessions} label="Sessões" />
      </div>
    </div>
  );
}

function SeasonStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center sm:text-right">
      <p className="text-2xl font-black tabular-nums text-white leading-none">{value}</p>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 block uppercase tracking-wider font-semibold">{label}</p>
    </div>
  );
}
