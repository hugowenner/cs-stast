import { Users2, Map, Swords, Flame, Calendar, Award } from "lucide-react";
import { formatRelativeTime } from "../players/PlayersSummaryCards";

interface QuickMetricsProps {
  totalPlayers: number;
  totalMaps: number;
  totalRounds: number;
  totalKills: number;
  latestMatch: {
    id: string;
    playedAt: Date | string;
    scoreTeamA: number;
    scoreTeamB: number;
    durationSeconds: number;
    map: {
      name: string;
    };
  } | null;
}

export function QuickMetrics({
  totalPlayers,
  totalMaps,
  totalRounds,
  totalKills,
  latestMatch,
}: QuickMetricsProps) {
  const formatDuration = (sec: number) => {
    const min = Math.floor(sec / 60);
    return `${min} min`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 1. Métricas da Base de Dados */}
      <div className="lg:col-span-2 rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Visão Geral da Plataforma</h2>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 flex-1">
          {/* Card: Total Players */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between hover:bg-white/[0.03] transition-colors">
            <Users2 className="size-4 text-muted-foreground mb-3" />
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Jogadores
              </span>
              <span className="text-xl font-black text-foreground">{totalPlayers}</span>
            </div>
          </div>

          {/* Card: Total Maps */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between hover:bg-white/[0.03] transition-colors">
            <Map className="size-4 text-muted-foreground mb-3" />
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Mapas
              </span>
              <span className="text-xl font-black text-foreground">{totalMaps}</span>
            </div>
          </div>

          {/* Card: Total Rounds */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between hover:bg-white/[0.03] transition-colors">
            <Swords className="size-4 text-muted-foreground mb-3" />
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Rounds
              </span>
              <span className="text-xl font-black text-foreground">{totalRounds}</span>
            </div>
          </div>

          {/* Card: Total Kills */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between hover:bg-white/[0.03] transition-colors">
            <Flame className="size-4 text-muted-foreground mb-3" />
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Kills
              </span>
              <span className="text-xl font-black text-foreground">{totalKills}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Última Partida Importada */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Última Partida Importada</h2>

        {latestMatch ? (
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-foreground">
                  {latestMatch.map.name}
                </span>
                <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" /> {formatRelativeTime(latestMatch.playedAt)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-foreground bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                  {latestMatch.scoreTeamA} : {latestMatch.scoreTeamB}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-muted-foreground px-1">
              <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                <span>Duração do Jogo:</span>
                <span className="text-foreground font-medium">
                  {formatDuration(latestMatch.durationSeconds)}
                </span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span>Plataforma:</span>
                <span className="text-foreground font-semibold flex items-center gap-1">
                  <Award className="size-3.5 text-sky-400" /> Gamers Club
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-white/10 rounded-xl text-center select-none text-muted-foreground min-h-[110px]">
            <span className="text-xs">Nenhuma partida importada</span>
          </div>
        )}
      </div>
    </div>
  );
}
