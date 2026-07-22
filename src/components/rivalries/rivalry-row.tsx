import { PlayerAvatar } from "@/components/players/player-avatar";

export interface RivalryRowData {
  id: string;
  matchesAgainst: number;
  winsA: number;
  winsB: number;
  winrateA: number;
  playerA: { nickname: string; avatarUrl: string | null };
  playerB: { nickname: string; avatarUrl: string | null };
  lastMatch?: {
    id: string;
    mapName: string;
    scoreA: number;
    scoreB: number;
  } | null;
}

export function RivalryRow({ rivalry }: { rivalry: RivalryRowData }) {
  const aLeads = rivalry.winsA > rivalry.winsB;
  const bLeads = rivalry.winsB > rivalry.winsA;

  return (
    <div className="py-2.5 sm:py-3 flex flex-col gap-2.5">
      {/* Layout Mobile (< sm) */}
      <div className="flex sm:hidden flex-col gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.01] w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <PlayerAvatar
              nickname={rivalry.playerA.nickname}
              avatarUrl={rivalry.playerA.avatarUrl}
              size="sm"
            />
            <span className={`truncate text-sm font-semibold ${aLeads ? "text-status-good" : "text-white"}`}>
              {rivalry.playerA.nickname}
            </span>
          </div>
          <span className="text-muted-foreground text-xs font-bold shrink-0">vs</span>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
            <span className={`truncate text-sm font-semibold ${bLeads ? "text-status-good" : "text-white"}`}>
              {rivalry.playerB.nickname}
            </span>
            <PlayerAvatar
              nickname={rivalry.playerB.nickname}
              avatarUrl={rivalry.playerB.avatarUrl}
              size="sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-0.5 text-xs">
          <span className="text-muted-foreground text-[10px]">
            {rivalry.matchesAgainst} {rivalry.matchesAgainst === 1 ? "partida" : "partidas"} · {rivalry.winrateA}% WR A
          </span>
          <span className="font-extrabold text-sm tabular-nums text-accent-cyan">
            {rivalry.winsA} × {rivalry.winsB}
          </span>
        </div>

        {rivalry.lastMatch && (
          <div className="text-[9px] text-muted-foreground border-t border-white/5 pt-1.5 mt-0.5 flex items-center justify-between">
            <span>Último confronto: {rivalry.lastMatch.mapName}</span>
            <span className="font-bold text-accent-cyan">{rivalry.lastMatch.scoreA} × {rivalry.lastMatch.scoreB}</span>
          </div>
        )}
      </div>

      {/* Layout Desktop (>= sm) */}
      <div className="hidden sm:flex items-center justify-between gap-3 w-full">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <PlayerAvatar
            nickname={rivalry.playerA.nickname}
            avatarUrl={rivalry.playerA.avatarUrl}
            size="sm"
          />
          <span
            className={`truncate text-sm ${aLeads ? "font-semibold text-status-good" : "text-muted-foreground"}`}
          >
            {rivalry.playerA.nickname}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <span className="text-sm font-bold tabular-nums text-white">
            {rivalry.winsA} <span className="text-muted-foreground font-normal">×</span> {rivalry.winsB}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {rivalry.matchesAgainst} {rivalry.matchesAgainst === 1 ? "partida" : "partidas"} · {rivalry.winrateA}% winrate
          </span>
        </div>

        <div className="hidden sm:flex min-w-0 flex-1 items-center justify-end gap-2">
          <span
            className={`truncate text-sm ${bLeads ? "font-semibold text-status-good" : "text-muted-foreground"}`}
          >
            {rivalry.playerB.nickname}
          </span>
          <PlayerAvatar
            nickname={rivalry.playerB.nickname}
            avatarUrl={rivalry.playerB.avatarUrl}
            size="sm"
          />
        </div>
      </div>

      {/* Último Confronto no Desktop */}
      {rivalry.lastMatch && (
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground bg-white/[0.01] border border-white/5 rounded-lg px-2.5 py-1 w-fit">
          <span className="font-semibold text-white">🔥 Último confronto:</span>
          <span className="capitalize">{rivalry.lastMatch.mapName}</span>
          <span className="font-bold text-accent-cyan">{rivalry.lastMatch.scoreA} × {rivalry.lastMatch.scoreB}</span>
        </div>
      )}
    </div>
  );
}
