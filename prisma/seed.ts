// Carrega .env antes de qualquer import que acesse process.env (db.ts inicializa
// o adapter na linha de módulo, então precisa de DATABASE_URL já disponível).
import "dotenv/config";
import { prisma } from "@/server/db";
import { ACHIEVEMENT_CATALOG } from "@/server/domain/achievementCatalog";
import { getSeasonNameForDate, getSeasonDatesForDate } from "@/server/services/season.service";

const ACTIVE_DUTY_MAPS = [
  "Mirage",
  "Inferno",
  "Ancient",
  "Anubis",
  "Nuke",
  "Overpass",
  "Vertigo",
  "Train",
  "Dust2",
];

async function main() {
  const now = new Date();
  const monthName = getSeasonNameForDate(now);
  const { startDate, endDate } = getSeasonDatesForDate(now);

  const defaultSeason = await prisma.season.upsert({
    where: { id: "default-season" },
    create: {
      id: "default-season",
      name: monthName,
      startDate,
      endDate,
      status: "ACTIVE",
    },
    update: {
      name: monthName,
      startDate,
      endDate,
    },
  });
  console.log(`Seed: Temporada ativa '${defaultSeason.name}' semeada.`);

  for (const entry of ACHIEVEMENT_CATALOG) {
    await prisma.achievement.upsert({
      where: { code: entry.code },
      create: entry,
      update: entry,
    });
  }
  console.log(`Seed: ${ACHIEVEMENT_CATALOG.length} conquistas no catálogo.`);

  for (const name of ACTIVE_DUTY_MAPS) {
    await prisma.map.upsert({ where: { name }, create: { name }, update: {} });
  }
  console.log(`Seed: ${ACTIVE_DUTY_MAPS.length} mapas no catálogo.`);

  const TRACKED_PLAYERS = [
    "481336",
    "231545",
    "125456",
    "789771",
    "125397",
    "525592",
    "1154575",
    "522398",
    "435954",
    "133224",
    "2392045",
    "2341177",
  ];

  for (const gamersClubId of TRACKED_PLAYERS) {
    await prisma.trackedPlayer.upsert({
      where: { gamersClubId },
      create: { gamersClubId, active: true },
      update: { active: true },
    });

    const existingPlayer = await prisma.player.findUnique({
      where: { gamersClubId },
    });
    if (existingPlayer) {
      await prisma.trackedPlayer.update({
        where: { gamersClubId },
        data: { playerId: existingPlayer.id },
      });
    }
  }
  console.log(`Seed: ${TRACKED_PLAYERS.length} jogadores monitorados cadastrados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
