import "dotenv/config";
import { prisma } from "@/server/db";
import { getMatchDetail } from "@/server/services/match.service";

async function main() {
  const gcMatchId = "27573167";
  const match = await prisma.match.findUnique({ where: { gamersClubMatchId: gcMatchId } });
  if (!match) return;

  const details = await getMatchDetail(match.id);
  console.log("Details returned from service:");
  console.log("Team A Players count:", details?.teams[0]?.players.length);
  for (const p of details?.teams[0]?.players || []) {
    console.log(`  - Nick: ${p.nickname} | isTracked: ${p.isTracked} | K: ${p.kills}`);
  }

  console.log("Team B Players count:", details?.teams[1]?.players.length);
  for (const p of details?.teams[1]?.players || []) {
    console.log(`  - Nick: ${p.nickname} | isTracked: ${p.isTracked} | K: ${p.kills}`);
  }
}

main().catch(console.error);
