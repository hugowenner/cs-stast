import fs from "fs";
import path from "path";
import type { MatchDetailsDTO } from "@/server/dtos/matchDetails.dto";

function loadTemplate(name: string): string {
  const templatePath = path.join(process.cwd(), "src/server/coach/templates", `${name}.md`);
  return fs.readFileSync(templatePath, "utf-8");
}

export function buildMatchPrompt(dto: MatchDetailsDTO): string {
  const template = loadTemplate("match");
  const { match, teams, highlights, timeline } = dto;

  const teamAPlayersText = teams.find((t) => t.side === "A")
    ? teams
        .find((t) => t.side === "A")!
        .players.map(
          (p) =>
            `- ${p.nickname}${p.isTracked ? " [Watchlist]" : ""}: Rating: ${p.rating.toFixed(2)} | ADR: ${p.adr.toFixed(1)} | KAST: ${p.kast.toFixed(1)}% | K/D/A: ${p.kills}/${p.deaths}/${p.assists} | HS%: ${p.hsPercentage.toFixed(1)}%`
        )
        .join("\n")
    : "Nenhum jogador";

  const teamBPlayersText = teams.find((t) => t.side === "B")
    ? teams
        .find((t) => t.side === "B")!
        .players.map(
          (p) =>
            `- ${p.nickname}${p.isTracked ? " [Watchlist]" : ""}: Rating: ${p.rating.toFixed(2)} | ADR: ${p.adr.toFixed(1)} | KAST: ${p.kast.toFixed(1)}% | K/D/A: ${p.kills}/${p.deaths}/${p.assists} | HS%: ${p.hsPercentage.toFixed(1)}%`
        )
        .join("\n")
    : "Nenhum jogador";

  const highlightsText = highlights
    .map((h) => `- [${h.type.toUpperCase()}] ${h.label}: ${h.player.nickname} (Valor: ${h.value})`)
    .join("\n");

  const timelineEventsText = timeline.length === 0
    ? "Sem eventos registrados."
    : timeline
        .slice(0, 15) // Limitar últimas 15 ocorrências para não inflar contexto
        .map((e) => `- Round ${e.roundNumber}: ${e.type} por ${e.playerNickname}${e.victimNickname ? ` em ${e.victimNickname}` : ""}`)
        .join("\n");

  return template
    .replace("{{mapName}}", match.mapName)
    .replace("{{scoreTeamA}}", String(match.scoreTeamA))
    .replace("{{scoreTeamB}}", String(match.scoreTeamB))
    .replace("{{playedAt}}", new Date(match.playedAt).toLocaleDateString("pt-BR"))
    .replace("{{duration}}", match.durationFormatted)
    .replace("{{sessionName}}", match.session.name ?? "N/A")
    .replace("{{eloChangeGroup}}", (match.eloChangeGroup >= 0 ? "+" : "") + match.eloChangeGroup)
    .replace("{{highlights}}", highlightsText)
    .replace("{{teamAPlayers}}", teamAPlayersText)
    .replace("{{teamBPlayers}}", teamBPlayersText)
    .replace("{{timelineEvents}}", timelineEventsText);
}
