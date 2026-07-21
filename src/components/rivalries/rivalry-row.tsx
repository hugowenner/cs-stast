import { Swords } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";

export interface RivalryRowData {
  id: string;
  killsAOnB: number;
  killsBOnA: number;
  matchesAgainst: number;
  playerA: { nickname: string; avatarUrl: string | null };
  playerB: { nickname: string; avatarUrl: string | null };
}

export function RivalryRow({ rivalry }: { rivalry: RivalryRowData }) {
  const aLeads = rivalry.killsAOnB >= rivalry.killsBOnA;

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <PlayerAvatar
          nickname={rivalry.playerA.nickname}
          avatarUrl={rivalry.playerA.avatarUrl}
          size="sm"
        />
        <span className={`truncate text-sm ${aLeads ? "font-semibold" : "text-muted-foreground"}`}>
          {rivalry.playerA.nickname}
        </span>
      </div>

      <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums">
        <span>{rivalry.killsAOnB}</span>
        <Swords className="text-accent-violet size-3.5" />
        <span>{rivalry.killsBOnA}</span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span className={`truncate text-sm ${!aLeads ? "font-semibold" : "text-muted-foreground"}`}>
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
