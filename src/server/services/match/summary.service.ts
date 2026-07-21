import type { MatchMetadataDTO } from "@/server/dtos/matchDetails.dto";

export function formatMatchSummary(match: any): MatchMetadataDTO {
  const durationMin = Math.floor(match.durationSeconds / 60);
  const durationSec = match.durationSeconds % 60;
  const durationFormatted = `${durationMin}m ${durationSec.toString().padStart(2, "0")}s`;

  // Somatório de ELO ganho/perdido pelos jogadores da watchlist nesta partida
  let eloChangeGroup = 0;
  for (const stat of match.playerStats) {
    const isTracked = !!stat.player.trackedPlayer?.active;
    if (isTracked) {
      eloChangeGroup += stat.eloAfter - stat.eloBefore;
    }
  }

  // Nome formatado da sessão
  const sessionName = match.session.name 
    ? match.session.name 
    : `Sessão de ${new Date(match.session.date).toLocaleDateString("pt-BR")}`;

  return {
    id: match.id,
    playedAt: match.playedAt,
    durationSeconds: match.durationSeconds,
    durationFormatted,
    mapName: match.map.name,
    scoreTeamA: match.scoreTeamA,
    scoreTeamB: match.scoreTeamB,
    session: {
      id: match.session.id,
      name: sessionName,
    },
    source: match.gamersClubMatchId ? "gamersclub" : "local",
    sourceId: match.gamersClubMatchId,
    eloChangeGroup,
  };
}
