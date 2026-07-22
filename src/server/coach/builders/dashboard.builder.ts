import fs from "fs";
import path from "path";

function loadTemplate(name: string): string {
  const templatePath = path.join(process.cwd(), "src/server/coach/templates", `${name}.md`);
  return fs.readFileSync(templatePath, "utf-8");
}

export function buildDashboardPrompt(dto: any): string {
  const template = loadTemplate("dashboard");
  const {
    seasonLabel,
    totalMatches,
    totalPlayers,
    totalSessions,
    community,
    dominantMap,
    bestPlayer,
    highlights,
  } = dto;

  return template
    .replace("{{seasonLabel}}", seasonLabel || "N/A")
    .replace("{{totalMatches}}", String(totalMatches || 0))
    .replace("{{totalPlayers}}", String(totalPlayers || 0))
    .replace("{{totalSessions}}", String(totalSessions || 0))
    .replace("{{avgWinrate}}", String(community?.avgWinrate ?? 0))
    .replace("{{avgKills}}", String(community?.avgKills ?? 0))
    .replace("{{avgHsPercent}}", String(community?.avgHsPercent ?? 0))
    .replace("{{totalRounds}}", String(community?.totalRounds ?? 0))
    .replace("{{bestPlayerName}}", bestPlayer?.nickname ?? "N/A")
    .replace("{{bestPlayerRating}}", bestPlayer?.rating ? bestPlayer.rating.toFixed(2) : "N/A")
    .replace("{{dominantMapName}}", dominantMap?.name ?? "N/A")
    .replace("{{dominantMapCount}}", String(dominantMap?.count ?? 0))
    .replace("{{dominantMapPercentage}}", String(dominantMap?.percentage ?? 0))
    .replace("{{recordStreakPlayer}}", highlights?.streak?.player ?? "N/A")
    .replace("{{recordStreakValue}}", String(highlights?.streak?.value ?? 0))
    .replace("{{recordKillsPlayer}}", highlights?.kills?.player ?? "N/A")
    .replace("{{recordKillsValue}}", String(highlights?.kills?.value ?? 0))
    .replace("{{recordKillsMap}}", highlights?.kills?.mapName ?? "N/A")
    .replace("{{recordClutchPlayer}}", highlights?.clutch?.player ?? "N/A")
    .replace("{{recordClutchType}}", highlights?.clutch?.type ?? "N/A")
    .replace("{{recordClutchMap}}", highlights?.clutch?.mapName ?? "N/A");
}
