import fs from "fs";
import path from "path";
import type { PlayerProfileDTO } from "@/server/dtos/playerProfile.dto";

function loadTemplate(name: string): string {
  const templatePath = path.join(process.cwd(), "src/server/coach/templates", `${name}.md`);
  return fs.readFileSync(templatePath, "utf-8");
}

export function buildPlayerPrompt(dto: PlayerProfileDTO): string {
  const template = loadTemplate("player");
  const { player, overview } = dto;

  return template
    .replace("{{nickname}}", player.nickname)
    .replace("{{gamersClubId}}", player.gamersClubId ?? "Não associado")
    .replace("{{totalMatches}}", String(overview.totalMatches))
    .replace("{{wins}}", String(overview.wins))
    .replace("{{losses}}", String(overview.losses))
    .replace("{{ties}}", String(overview.ties))
    .replace("{{winrate}}", String(overview.winrate))
    .replace("{{ratingAvg}}", overview.ratingAvg.toFixed(2))
    .replace("{{kd}}", overview.kd.toFixed(2))
    .replace("{{adrAvg}}", overview.adrAvg.toFixed(1))
    .replace("{{kastAvg}}", overview.kastAvg.toFixed(1))
    .replace("{{hsPercentage}}", overview.hsPercentage.toFixed(1))
    .replace("{{bestMapName}}", overview.summaryCoach.bestMap?.name ?? "N/A")
    .replace("{{bestMapWinrate}}", String(overview.summaryCoach.bestMap?.winrate.toFixed(1) ?? 0))
    .replace("{{worstMapName}}", overview.summaryCoach.worstMap?.name ?? "N/A")
    .replace("{{worstMapWinrate}}", String(overview.summaryCoach.worstMap?.winrate.toFixed(1) ?? 0))
    .replace("{{ratingTrend}}", overview.summaryCoach.ratingTrend)
    .replace("{{last10Wins}}", String(overview.summaryCoach.last10Winrate?.wins ?? 0))
    .replace("{{last10Losses}}", String(overview.summaryCoach.last10Winrate?.losses ?? 0))
    .replace("{{last10Winrate}}", String(overview.summaryCoach.last10Winrate?.winrate ?? 0))
    .replace("{{favoritePartnerNickname}}", overview.summaryCoach.favoritePartner?.nickname ?? "N/A")
    .replace("{{favoritePartnerMatches}}", String(overview.summaryCoach.favoritePartner?.matches ?? 0));
}
