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
  // scoreTeamA/scoreTeamB são Int não-anuláveis no schema — filtrar por null é inválido.
  // Verificamos integridade semântica: no CS2 é impossível uma partida terminar 0×0.
  const gcTotal = await prisma.match.count({
    where: { gamersClubMatchId: { not: null } },
  });
  const zeroed = await prisma.match.findMany({
    where: {
      gamersClubMatchId: { not: null },
      scoreTeamA: 0,
      scoreTeamB: 0,
    },
    select: { id: true, gamersClubMatchId: true },
  });
  if (zeroed.length === 0) {
    record("Scores GC válidos", "pass", `${gcTotal} partidas GC — nenhuma com placar 0×0`);
  } else {
    record(
      "Scores GC zerados (impossível no CS2)",
      "fail",
      `${zeroed.length} partida(s) GC com placar 0×0: ${zeroed.map((m) => m.gamersClubMatchId).join(", ")}`
    );
  }
}

async function checkRosters() {
  console.log("\n[Rosters]");
  // team e playerId são não-anuláveis no schema — integridade é garantida pelo banco.
  // Verificamos integridade semântica: cada partida deve ter exatamente 2 times distintos.
  const totalStats = await prisma.playerMatchStats.count();
  const totalMatches = await prisma.match.count();
  record("PlayerMatchStats cadastrados", "pass", `${totalStats} stats em ${totalMatches} partidas`);

  // Partidas onde todos os stats têm o mesmo time (roster partido)
  const matchesWithSingleSide = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "Match" m
    WHERE EXISTS (SELECT 1 FROM "PlayerMatchStats" WHERE "matchId" = m.id)
      AND (SELECT COUNT(DISTINCT team) FROM "PlayerMatchStats" WHERE "matchId" = m.id) = 1
  `;
  const singleSideCount = Number(matchesWithSingleSide[0]?.count ?? 0);
  if (singleSideCount === 0) {
    record("Rosters balanceados (2 times por partida)", "pass", "Todas as partidas têm jogadores nos dois lados");
  } else {
    record("Partidas com roster de 1 só time", "fail", `${singleSideCount} partida(s) com stats de apenas um lado`);
  }
}

async function checkRankings() {
  console.log("\n[Rankings / Rivalries]");
  // playerAId/playerBId são String não-anuláveis — checamos integridade semântica:
  // por convenção, playerAId < playerBId (lexicográfico). Auto-rivalidade é impossível.
  const totalRivalries = await prisma.rivalry.count();
  record("Rivalidades cadastradas", "pass", `${totalRivalries} total`);

  // Detectar auto-rivalidades (playerAId === playerBId) via raw query
  const selfRivalryRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Rivalry" WHERE "playerAId" = "playerBId"
  `;
  const selfCount = Number(selfRivalryRows[0]?.count ?? 0);
  if (selfCount === 0) {
    record("Auto-rivalidades", "pass", "Nenhuma rivalidade onde playerA === playerB");
  } else {
    record("Auto-rivalidades", "fail", `${selfCount} rivalidade(s) onde playerA === playerB`);
  }
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
