import { TacticalBadge } from "@/components/ui/tactical-badge";
import { cn } from "@/lib/utils";
import type { MatchMetadataDTO, HighlightDTO } from "@/server/dtos/matchDetails.dto";

export function MatchSummary({
  match,
  highlights,
}: {
  match: MatchMetadataDTO;
  highlights: HighlightDTO[];
}) {
  const mvp = highlights.find((h) => h.type === "mvp");
  const adr = highlights.find((h) => h.type === "adr");
  const hs = highlights.find((h) => h.type === "hs");
  const kast = highlights.find((h) => h.type === "kast");

  const cleanMapName = match.mapName.replace(/^de_/i, "").toUpperCase();

  const outcomeText =
    match.eloChangeGroup > 0
      ? "VITÓRIA"
      : match.eloChangeGroup < 0
      ? "DERROTA"
      : match.scoreTeamA === match.scoreTeamB
      ? "EMPATE"
      : "CONCLUÍDA";

  const outcomeVariant =
    match.eloChangeGroup > 0
      ? "good"
      : match.eloChangeGroup < 0
      ? "critical"
      : "warning";

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
      {/* Bloco de Resultado */}
      <div
        className={cn(
          "surface-panel rounded-sm p-5 border flex flex-col justify-between gap-2",
          outcomeVariant === "good"
            ? "border-status-good/40 bg-status-good/[0.04]"
            : outcomeVariant === "critical"
            ? "border-status-critical/40 bg-status-critical/[0.04]"
            : "border-border/60 bg-surface-deck"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">
            RESULTADO COLETIVO
          </span>
          <TacticalBadge variant={outcomeVariant} size="sm">
            {outcomeText}
          </TacticalBadge>
        </div>
        <div>
          <h2
            className={cn(
              "text-2xl sm:text-3xl font-mono font-black tracking-tight",
              outcomeVariant === "good"
                ? "text-status-good"
                : outcomeVariant === "critical"
                ? "text-status-critical"
                : "text-foreground"
            )}
          >
            {outcomeText}
          </h2>
          <p className="text-xs font-mono text-muted-foreground/70 mt-1">
            {cleanMapName} · {match.scoreTeamA} - {match.scoreTeamB}
          </p>
        </div>
      </div>

      {/* Destaques Rápidos */}
      <div className="surface-panel rounded-sm col-span-1 lg:col-span-3 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 border border-border/40">
        {/* MVP */}
        {mvp ? (
          <div className="flex flex-col justify-between p-2 rounded-xs bg-surface-deck border border-border/30">
            <span className="text-[10px] font-mono font-bold text-accent-gold uppercase tracking-wider">
              MVP da Partida
            </span>
            <span className="text-sm font-bold text-foreground truncate mt-1">{mvp.player.nickname}</span>
            <span className="text-xs font-mono text-muted-foreground/70 mt-0.5">Rating: <strong className="text-accent-gold font-bold">{mvp.value}</strong></span>
          </div>
        ) : null}

        {/* Maior ADR */}
        {adr ? (
          <div className="flex flex-col justify-between p-2 rounded-xs bg-surface-deck border border-border/30">
            <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
              Maior ADR
            </span>
            <span className="text-sm font-bold text-foreground truncate mt-1">{adr.player.nickname}</span>
            <span className="text-xs font-mono text-muted-foreground/70 mt-0.5">ADR: <strong className="text-foreground font-bold">{adr.value}</strong></span>
          </div>
        ) : null}

        {/* Maior HS% */}
        {hs ? (
          <div className="flex flex-col justify-between p-2 rounded-xs bg-surface-deck border border-border/30">
            <span className="text-[10px] font-mono font-bold text-accent-cyan uppercase tracking-wider">
              Maior HS%
            </span>
            <span className="text-sm font-bold text-foreground truncate mt-1">{hs.player.nickname}</span>
            <span className="text-xs font-mono text-muted-foreground/70 mt-0.5">HS: <strong className="text-accent-cyan font-bold">{hs.value}</strong></span>
          </div>
        ) : null}

        {/* Melhor KAST */}
        {kast ? (
          <div className="flex flex-col justify-between p-2 rounded-xs bg-surface-deck border border-border/30">
            <span className="text-[10px] font-mono font-bold text-status-good uppercase tracking-wider">
              Melhor KAST
            </span>
            <span className="text-sm font-bold text-foreground truncate mt-1">{kast.player.nickname}</span>
            <span className="text-xs font-mono text-muted-foreground/70 mt-0.5">KAST: <strong className="text-status-good font-bold">{kast.value}</strong></span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
