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

  // Decisão do resultado baseado no saldo de ELO da watchlist
  const outcomeText =
    match.eloChangeGroup > 0
      ? "Vitória"
      : match.eloChangeGroup < 0
      ? "Derrota"
      : match.scoreTeamA === match.scoreTeamB
      ? "Empate"
      : "Partida Concluída";

  const outcomeBgClass =
    match.eloChangeGroup > 0
      ? "bg-status-good/10 text-status-good border-status-good/20"
      : match.eloChangeGroup < 0
      ? "bg-status-critical/10 text-status-critical border-status-critical/20"
      : "bg-white/5 text-muted-foreground border-white/10";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      {/* Bloco de Resultado */}
      <div className={`glass-panel flex flex-col justify-center p-5 border ${outcomeBgClass}`}>
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
          Resultado do Grupo
        </span>
        <h2 className="text-2xl font-black mt-1">{outcomeText}</h2>
        <p className="text-xs mt-0.5 opacity-85">
          {match.mapName} · {match.scoreTeamA} x {match.scoreTeamB}
        </p>
      </div>

      {/* Destaques Rápidos */}
      <div className="glass-panel col-span-1 lg:col-span-3 grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 border border-white/5 bg-white/[0.02]">
        {/* MVP */}
        {mvp && (
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              MVP da Partida
            </span>
            <span className="text-sm font-bold mt-1 text-white truncate">{mvp.player.nickname}</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">Rating: {mvp.value}</span>
          </div>
        )}

        {/* Maior ADR */}
        {adr && (
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Maior ADR
            </span>
            <span className="text-sm font-bold mt-1 text-white truncate">{adr.player.nickname}</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">ADR: {adr.value}</span>
          </div>
        )}

        {/* Maior HS% */}
        {hs && (
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Maior HS%
            </span>
            <span className="text-sm font-bold mt-1 text-white truncate">{hs.player.nickname}</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">HS: {hs.value}</span>
          </div>
        )}

        {/* Melhor KAST */}
        {kast && (
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Melhor KAST
            </span>
            <span className="text-sm font-bold mt-1 text-white truncate">{kast.player.nickname}</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">KAST: {kast.value}</span>
          </div>
        )}
      </div>
    </div>
  );
}
