import { prisma } from "@/server/db";
import type { SyncMatchInput } from "@/server/dtos/sync.dto";
import * as matchRepo from "@/server/repositories/match.repository";
import { gcSyncMatch, type GcSyncOptions, type IngestMatchResult } from "./ingest/gc-sync.service";
import { formatMatchSummary } from "./match/summary.service";
import { formatMatchTeams } from "./match/players.service";
import { calculateMatchHighlights } from "./match/awards.service";
import type { MatchDetailsDTO } from "@/server/dtos/matchDetails.dto";

export async function getMatchDetail(id: string): Promise<MatchDetailsDTO | null> {
  const match = await matchRepo.findMatchDetailsById(id);
  if (!match) return null;

  const summary = formatMatchSummary(match);
  const teams = formatMatchTeams(match);

  // Reúne todos os jogadores de ambos os times para calcular recordistas/awards
  const allFormattedPlayers = [...teams[0].players, ...teams[1].players];
  const highlights = calculateMatchHighlights(allFormattedPlayers);

  // Mapeia eventos para a timeline
  const timeline = match.events.map((event: any) => ({
    id: event.id,
    type: event.type,
    roundNumber: event.roundNumber,
    playerNickname: event.player.nickname,
    victimNickname: event.victim?.nickname ?? null,
  }));

  return {
    match: summary,
    teams,
    highlights,
    timeline,
  };
}

export function listRecentMatches(take?: number, seasonId?: string) {
  return matchRepo.listRecentMatches(take, seasonId);
}

export type IngestMatchOptions = GcSyncOptions;

export async function ingestMatchSync(
  input: SyncMatchInput,
  options: IngestMatchOptions = {},
): Promise<IngestMatchResult> {
  return gcSyncMatch(input, options);
}
