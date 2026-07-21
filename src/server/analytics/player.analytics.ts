export function calculateKD(kills: number, deaths: number): number {
  const kd = deaths > 0 ? kills / deaths : kills;
  return Math.round(kd * 100) / 100;
}

export function calculateHSPercentage(headshots: number, kills: number): number {
  const hs = kills > 0 ? (headshots / kills) * 100 : 0;
  return Math.round(hs * 10) / 10;
}

export function calculateWinrate(wins: number, total: number): number {
  const wr = total > 0 ? (wins / total) * 100 : 0;
  return Math.round(wr * 10) / 10;
}

export interface MatchOutcomeInput {
  team: string; // "A" ou "B"
  scoreTeamA: number;
  scoreTeamB: number;
}

export function evaluateMatchResult(outcome: MatchOutcomeInput): "win" | "loss" | "tie" {
  const scoreSelf = outcome.team === "A" ? outcome.scoreTeamA : outcome.scoreTeamB;
  const scoreOpp = outcome.team === "A" ? outcome.scoreTeamB : outcome.scoreTeamA;
  if (scoreSelf > scoreOpp) return "win";
  if (scoreSelf < scoreOpp) return "loss";
  return "tie";
}

export function calculateRatingTrend(ratings: number[]): string {
  if (ratings.length < 2) return "+0.00";
  const recent = ratings.slice(-5);
  const older = ratings.slice(-10, -5);
  if (recent.length === 0 || older.length === 0) return "+0.00";
  const avgRecent = recent.reduce((sum, r) => sum + r, 0) / recent.length;
  const avgOlder = older.reduce((sum, r) => sum + r, 0) / older.length;
  const diff = avgRecent - avgOlder;
  return (diff >= 0 ? "+" : "") + diff.toFixed(2);
}
