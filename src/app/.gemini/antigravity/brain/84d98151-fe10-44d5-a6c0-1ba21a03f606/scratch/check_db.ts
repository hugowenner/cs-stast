import { prisma } from "C:/Users/ramobh/Documents/cs2-stats/src/server/db";

async function main() {
  const statsCount = await prisma.playerMatchStats.count();
  const comGcRating = await prisma.playerMatchStats.count({
    where: { gcRating: { not: null } }
  });
  const comDamage = await prisma.playerMatchStats.count({
    where: { damage: { not: null } }
  });
  const comDoubleKills = await prisma.playerMatchStats.count({
    where: { doubleKills: { not: null } }
  });
  const sumDoubleKills = await prisma.playerMatchStats.aggregate({
    _sum: {
      doubleKills: true,
      tripleKills: true,
      quadKills: true,
      aces: true
    }
  });

  console.log("=== DB AUDIT RESULTS POST-REPROCESS ===");
  console.log("Total PlayerMatchStats:", statsCount);
  console.log("Com gcRating:", comGcRating);
  console.log("Com damage:", comDamage);
  console.log("Com doubleKills:", comDoubleKills);
  console.log("Soma total Double Kills (2K):", sumDoubleKills._sum.doubleKills);
  console.log("Soma total Triple Kills (3K):", sumDoubleKills._sum.tripleKills);
  console.log("Soma total Quad Kills (4K):", sumDoubleKills._sum.quadKills);
  console.log("Soma total Aces:", sumDoubleKills._sum.aces);
}

main().catch(console.error);
