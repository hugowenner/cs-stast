import fs from "fs";
import path from "path";
import type { SessionSummaryDTO } from "@/server/dtos/sessionSummary.dto";

function loadTemplate(name: string): string {
  const templatePath = path.join(process.cwd(), "src/server/coach/templates", `${name}.md`);
  return fs.readFileSync(templatePath, "utf-8");
}

export function buildSessionPrompt(dto: SessionSummaryDTO): string {
  const template = loadTemplate("session");
  const { metadata, overview, highlights, trends, maps, bestDuo, timeline, insights } = dto;

  const highlightsText = highlights
    .map((h) => `- [${h.category.toUpperCase()}] ${h.label}: ${h.playerName} (Valor: ${h.value})`)
    .join("\n");

  const trendsText = trends
    .map((t) => `- ${t.label}: ${t.value} (Tendência: ${t.direction.toUpperCase()})`)
    .join("\n");

  const mapsText = maps
    .map((m) => `- ${m.mapName}: ${m.matchesPlayed} partidas (${m.wins}V - ${m.losses}D, Winrate: ${m.winrate.toFixed(1)}%)`)
    .join("\n");

  const timelineText = timeline
    .slice(0, 15) // Limitar a 15 eventos para evitar context blowup
    .map((e) => `- [${e.type.toUpperCase()}] ${e.title}: ${e.description}`)
    .join("\n");

  const insightsText = insights.length === 0
    ? "Sem insights pré-calculados."
    : insights.map((i) => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.description}`).join("\n");

  return template
    .replace("{{sessionName}}", metadata.name)
    .replace("{{sessionDate}}", new Date(metadata.date).toLocaleDateString("pt-BR"))
    .replace("{{mood}}", metadata.mood.toUpperCase())
    .replace("{{teamSynergy}}", String(overview.teamSynergy))
    .replace("{{totalMatches}}", String(overview.totalMatches))
    .replace("{{wins}}", String(overview.wins))
    .replace("{{losses}}", String(overview.losses))
    .replace("{{ties}}", String(overview.ties))
    .replace("{{winrate}}", String(overview.winrate.toFixed(1)))
    .replace("{{eloChangeGroup}}", (overview.eloChangeGroup >= 0 ? "+" : "") + overview.eloChangeGroup)
    .replace("{{ratingAvg}}", overview.ratingAvg.toFixed(2))
    .replace("{{adrAvg}}", overview.adrAvg.toFixed(1))
    .replace("{{hsPercentage}}", overview.hsPercentage.toFixed(1))
    .replace("{{highlights}}", highlightsText)
    .replace("{{trends}}", trendsText)
    .replace("{{maps}}", mapsText)
    .replace("{{bestDuoPlayerA}}", bestDuo?.playerAName ?? "N/A")
    .replace("{{bestDuoPlayerB}}", bestDuo?.playerBName ?? "N/A")
    .replace("{{bestDuoWins}}", String(bestDuo?.wins ?? 0))
    .replace("{{bestDuoLosses}}", String(bestDuo?.losses ?? 0))
    .replace("{{timelineEvents}}", timelineText)
    .replace("{{insights}}", insightsText);
}
