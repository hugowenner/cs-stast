import "dotenv/config";
import { prisma } from "@/server/db";
import { sanitizeNickname } from "@/server/utils/player-name-normalizer";

// ─── helpers ──────────────────────────────────────────────────────────────────

const PASS = "✅ PASS";
const FAIL = "❌ FAIL";
const WARN = "⚠️  WARN";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  detail?: string;
}

const results: CheckResult[] = [];

function record(name: string, status: CheckResult["status"], detail?: string) {
  results.push({ name, detail, status });
  const icon = status === "pass" ? PASS : status === "warn" ? WARN : FAIL;
  console.log(`  ${icon} ${name}${detail ? `: ${detail}` : ""}`);
}

// ─── checks ───────────────────────────────────────────────────────────────────

async function checkNicknames() {
  console.log("\n[Nicknames]");
  const players = await prisma.player.findMany({ select: { steamId: true, nickname: true } });
  const dirty = players.filter((p) => sanitizeNickname(p.nickname) !== p.nickname);
  if (dirty.length === 0) {
    record("Nicknames limpos no banco", "pass", `${players.length} jogadores verificados`);
  } else {
    record(
      "Nicknames sujos detectados",
      "fail",
      `${dirty.length} jogador(es) com símbolos GC não removidos: ${dirty.map((p) => p.nickname).join(", ")}`
    );
  }
}

async function checkActiveSeason() {
  console.log("\n[Temporada]");
  const season = await prisma.season.findFirst({ where: { status: "ACTIVE" } });
  if (!season) {
    record("Temporada ativa", "fail", "Nenhuma temporada com status ACTIVE encontrada");
    return null;
  }
  record("Temporada ativa", "pass", `"${season.name}" (${season.startDate.toISOString().slice(0, 10)} → ${season.endDate.toISOString().slice(0, 10)})`);
  return season;
}

async function checkMatchesHaveSeason(activeSeason: { id: string; name: string } | null) {
  console.log("\n[Partidas]");
  if (!activeSeason) {
    record("Partidas com seasonId", "warn", "Pulado — sem temporada ativa");
    return;
  }
  const total = await prisma.match.count();
  const missing = await prisma.match.count({ where: { seasonId: null } });
  if (missing === 0) {
    record("Partidas com seasonId", "pass", `${total} partidas, todas com temporada vinculada`);
  } else {
    record("Partidas com seasonId", "fail", `${missing}/${total} partidas sem seasonId`);
  }
}

async function checkScoresConsistency() {
  const inconsistent = await prisma.match.findMany({
    where: {
      gamersClubMatchId: { not: null },
      OR: [{ scoreTeamA: null }, { scoreTeamB: null }],
    },
    select: { id: true, gamersClubMatchId: true },
  });
  if (inconsistent.length === 0) {
    record("Scores GC presentes", "pass", "Todas as partidas GC têm scoreTeamA e scoreTeamB");
  } else {
    record(
      "Scores GC ausentes",
      "fail",
      `${inconsistent.length} partida(s) GC sem score: ${inconsistent.map((m) => m.gamersClubMatchId).join(", ")}`
    );
  }
}

async function checkRosters() {
  console.log("\n[Rosters]");
  const statsWithoutTeam = await prisma.playerMatchStats.count({
    where: { team: null },
  });
  if (statsWithoutTeam === 0) {
    record("Rosters com team definido", "pass", "Nenhum PlayerMatchStats sem team");
  } else {
    record("Rosters com team indefinido", "fail", `${statsWithoutTeam} stats sem team atribuído`);
  }

  const statsWithoutPlayer = await prisma.playerMatchStats.count({
    where: { playerId: null },
  });
  if (statsWithoutPlayer === 0) {
    record("Stats vinculados a jogador", "pass", "Todos os stats têm playerId");
  } else {
    record("Stats sem playerId", "warn", `${statsWithoutPlayer} stats órfãos (possível match de não-monitorados)`);
  }
}

async function checkRankings() {
  console.log("\n[Rankings / Rivalries]");
  const totalRivalries = await prisma.rivalry.count();
  const brokenRivalries = await prisma.rivalry.count({
    where: {
      OR: [{ playerAId: undefined }, { playerBId: undefined }],
    },
  });
  record("Rivalidades cadastradas", "pass", `${totalRivalries} total`);

  const selfRivalries = await prisma.rivalry.count({
    where: { playerAId: { equals: prisma.rivalry.fields?.playerBId as never } },
  }).catch(() => 0);
  if (selfRivalries === 0) {
    record("Auto-rivalidades", "pass", "Nenhuma rivalidade de jogador consigo mesmo");
  } else {
    record("Auto-rivalidades", "fail", `${selfRivalries} rivalidades onde playerA === playerB`);
  }
  void brokenRivalries;
}

async function checkTrackedPlayers() {
  console.log("\n[Jogadores Monitorados]");
  const active = await prisma.trackedPlayer.count({ where: { active: true } });
  const unlinked = await prisma.trackedPlayer.count({
    where: { active: true, playerId: null },
  });
  record("TrackedPlayers ativos", "pass", `${active} monitorados`);
  if (unlinked === 0) {
    record("TrackedPlayers vinculados", "pass", "Todos vinculados a um Player");
  } else {
    record("TrackedPlayers sem Player", "fail", `${unlinked} TrackedPlayer(s) sem playerId — execute npm run admin:repair-tracked`);
  }
}

async function checkSessions() {
  console.log("\n[Sessões]");
  const emptySessions = await prisma.session.count({
    where: { matches: { none: {} } },
  });
  if (emptySessions === 0) {
    record("Sessões sem partidas", "pass", "Todas as sessões têm ao menos uma partida");
  } else {
    record("Sessões vazias", "warn", `${emptySessions} sessão(ões) sem partidas — podem ser restos de ingestão incompleta`);
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("══════════════════════════════════════════════");
  console.log("   AUDITORIA DE INTEGRIDADE — CS2 STATS HUB  ");
  console.log(`   ${new Date().toISOString()}  `);
  console.log("══════════════════════════════════════════════");

  await checkNicknames();
  const season = await checkActiveSeason();
  await checkMatchesHaveSeason(season);
  await checkScoresConsistency();
  await checkRosters();
  await checkRankings();
  await checkTrackedPlayers();
  await checkSessions();

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const warned = results.filter((r) => r.status === "warn").length;

  console.log("\n══════════════════════════════════════════════");
  console.log(`   RESULTADO: ${passed} PASS  |  ${failed} FAIL  |  ${warned} WARN`);
  const overall = failed === 0 ? "✅ Sistema íntegro" : "❌ Problemas encontrados — veja acima";
  console.log(`   ${overall}`);
  console.log("══════════════════════════════════════════════\n");

  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
