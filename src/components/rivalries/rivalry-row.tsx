import { PlayerAvatar } from "@/components/players/player-avatar";

export interface RivalryRowData {
  id: string;
  matchesAgainst: number;
  winsA: number;
  winsB: number;
  winrateA: number;
  playerA: { nickname: string; avatarUrl: string | null };
  playerB: { nickname: string; avatarUrl: string | null };
}

export function RivalryRow({ rivalry }: { rivalry: RivalryRowData }) {
  const aLeads = rivalry.winsA > rivalry.winsB;
  const bLeads = rivalry.winsB > rivalry.winsA;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
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
        <span className="text-[10px] text-muted-foreground">
          {rivalry.matchesAgainst} {rivalry.matchesAgainst === 1 ? "partida" : "partidas"} · {rivalry.winrateA}% winrate
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
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
  );
}
