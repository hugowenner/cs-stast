/**
 * ELO interno por jogador. CS2 é 5v5, então a atualização parte do ELO médio de cada
 * time (ELO clássico time-a-time), mas o delta de cada jogador é escalado pela sua
 * performance na partida (Rating) relativa à média do próprio time — quem carregou o
 * time ganha mais numa vitória e perde menos numa derrota; quem jogou mal, o oposto.
 * O multiplicador é limitado a [0.5, 1.5] para evitar oscilações extremas em uma
 * única partida.
 */
export const DEFAULT_ELO = 1000;
export const DEFAULT_K_FACTOR = 32;

export interface EloPlayerInput {
  playerId: string;
  team: "A" | "B";
  eloBefore: number;
  rating: number;
}

export interface EloResult {
  playerId: string;
  eloBefore: number;
  eloAfter: number;
}

export interface MatchOutcome {
  scoreTeamA: number;
  scoreTeamB: number;
}

export function calculateEloUpdates(
  players: EloPlayerInput[],
  outcome: MatchOutcome,
  kFactor = DEFAULT_K_FACTOR,
): EloResult[] {
  const teamA = players.filter((p) => p.team === "A");
  const teamB = players.filter((p) => p.team === "B");

  const teamAElo = average(teamA.map((p) => p.eloBefore));
  const teamBElo = average(teamB.map((p) => p.eloBefore));

  const expectedA = 1 / (1 + 10 ** ((teamBElo - teamAElo) / 400));
  const expectedB = 1 - expectedA;

  const actualA =
    outcome.scoreTeamA === outcome.scoreTeamB
      ? 0.5
      : outcome.scoreTeamA > outcome.scoreTeamB
        ? 1
        : 0;
  const actualB = 1 - actualA;

  const teamARatingAvg = average(teamA.map((p) => p.rating));
  const teamBRatingAvg = average(teamB.map((p) => p.rating));

  return [
    ...updateTeam(teamA, actualA, expectedA, teamARatingAvg, kFactor),
    ...updateTeam(teamB, actualB, expectedB, teamBRatingAvg, kFactor),
  ];
}

function updateTeam(
  team: EloPlayerInput[],
  actual: number,
  expected: number,
  teamRatingAvg: number,
  kFactor: number,
): EloResult[] {
  const baseDelta = kFactor * (actual - expected);
  return team.map((p) => {
    const performanceMultiplier = clamp(teamRatingAvg > 0 ? p.rating / teamRatingAvg : 1, 0.5, 1.5);
    const delta = Math.round(baseDelta * performanceMultiplier);
    return { playerId: p.playerId, eloBefore: p.eloBefore, eloAfter: p.eloBefore + delta };
  });
}

function average(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
