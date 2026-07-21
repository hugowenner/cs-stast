import fs from "fs";
import path from "path";
import type { PlayerComparisonDTO } from "@/server/dtos/playerComparison.dto";

function loadTemplate(name: string): string {
  const templatePath = path.join(process.cwd(), "src/server/coach/templates", `${name}.md`);
  return fs.readFileSync(templatePath, "utf-8");
}

export function buildComparisonPrompt(dto: PlayerComparisonDTO): string {
  const template = loadTemplate("comparison");
  const { players, compatibility, h2h, insights } = dto;

  if (players.length < 2) {
    throw new Error("São necessários pelo menos 2 jogadores para compilar o prompt de comparação.");
  }

  const [pA, pB] = players;

  const insightsText = insights.length === 0
    ? "Sem insights pré-calculados."
    : insights.map((i) => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.description}`).join("\n");

  return template
    .replace("{{nicknameA}}", pA.nickname)
    .replace("{{ratingA}}", pA.metrics.rating.toFixed(2))
    .replace("{{kdA}}", pA.metrics.kd.toFixed(2))
    .replace("{{adrA}}", pA.metrics.adr.toFixed(1))
    .replace("{{kastA}}", pA.metrics.kast.toFixed(1))
    .replace("{{hsPercentageA}}", pA.metrics.hsPercentage.toFixed(1))
    .replace("{{winrateA}}", pA.metrics.winrate.toFixed(1))
    .replace("{{bestMapA}}", pA.bestMap?.name ?? "N/A")
    .replace("{{bestMapWinrateA}}", String(pA.bestMap?.winrate.toFixed(1) ?? 0))
    .replace("{{worstMapA}}", pA.worstMap?.name ?? "N/A")
    .replace("{{worstMapWinrateA}}", String(pA.worstMap?.winrate.toFixed(1) ?? 0))
    
    .replace("{{nicknameB}}", pB.nickname)
    .replace("{{ratingB}}", pB.metrics.rating.toFixed(2))
    .replace("{{kdB}}", pB.metrics.kd.toFixed(2))
    .replace("{{adrB}}", pB.metrics.adr.toFixed(1))
    .replace("{{kastB}}", pB.metrics.kast.toFixed(1))
    .replace("{{hsPercentageB}}", pB.metrics.hsPercentage.toFixed(1))
    .replace("{{winrateB}}", pB.metrics.winrate.toFixed(1))
    .replace("{{bestMapB}}", pB.bestMap?.name ?? "N/A")
    .replace("{{bestMapWinrateB}}", String(pB.bestMap?.winrate.toFixed(1) ?? 0))
    .replace("{{worstMapB}}", pB.worstMap?.name ?? "N/A")
    .replace("{{worstMapWinrateB}}", String(pB.worstMap?.winrate.toFixed(1) ?? 0))

    .replace("{{compatibilityScore}}", String(compatibility.score))
    .replace("{{compatibilityLabel}}", compatibility.label)
    .replace("{{togetherMatches}}", String(h2h.together.total))
    .replace("{{togetherWins}}", String(h2h.together.wins))
    .replace("{{togetherLosses}}", String(h2h.together.losses))
    .replace("{{togetherWinrate}}", String(h2h.together.winrate.toFixed(1)))
    .replace("{{againstMatches}}", String(h2h.against.total))
    .replace("{{winsA}}", String(h2h.against.wins[pA.id] ?? 0))
    .replace("{{winsB}}", String(h2h.against.wins[pB.id] ?? 0))
    
    .replace("{{insights}}", insightsText);
}
