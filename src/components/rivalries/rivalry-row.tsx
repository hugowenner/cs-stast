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
  const tied = rivalry.winsA === rivalry.winsB;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 flex flex-col gap-3 hover:border-white/[0.12] hover:bg-white/[0.035] transition-all duration-200 group">

      {/* Cabeçalho: jogadores + placar central */}
      <div className="flex items-center gap-3">
        {/* Jogador A */}
        <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
          <PlayerAvatar
            nickname={rivalry.playerA.nickname}
            avatarUrl={rivalry.playerA.avatarUrl}
            size="md"
          />
          <span className={`text-xs font-bold truncate max-w-full text-center ${aLeads ? "text-white" : "text-muted-foreground"}`}>
            {rivalry.playerA.nickname}
          </span>
        </div>

        {/* Placar central */}
        <div className="flex flex-col items-center gap-0.5 shrink-0 px-2">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black tabular-nums leading-none ${aLeads ? "text-white" : tied ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
              {rivalry.winsA}
            </span>
            <span className="text-sm text-muted-foreground/40 font-light">×</span>
            <span className={`text-2xl font-black tabular-nums leading-none ${bLeads ? "text-white" : tied ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
              {rivalry.winsB}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            {rivalry.matchesAgainst} {rivalry.matchesAgainst === 1 ? "partida" : "partidas"}
          </span>
        </div>

        {/* Jogador B */}
        <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
          <PlayerAvatar
            nickname={rivalry.playerB.nickname}
            avatarUrl={rivalry.playerB.avatarUrl}
            size="md"
          />
          <span className={`text-xs font-bold truncate max-w-full text-center ${bLeads ? "text-white" : "text-muted-foreground"}`}>
            {rivalry.playerB.nickname}
          </span>
        </div>
      </div>

      {/* Barra de domínio */}
      <div className="relative h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${aLeads ? "bg-accent-cyan" : bLeads ? "bg-accent-violet" : "bg-white/20"}`}
          style={{ width: `${rivalry.winrateA}%` }}
        />
      </div>

      {/* Último confronto */}
      {rivalry.lastMatch && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 pt-0.5">
          <span className="capitalize">{rivalry.lastMatch.mapName}</span>
          <span className="font-bold text-muted-foreground tabular-nums">
            {rivalry.lastMatch.scoreA}–{rivalry.lastMatch.scoreB}
          </span>
        </div>
      )}
    </div>
  );
}
