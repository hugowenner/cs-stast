import { prisma } from "@/server/db";
import * as competitiveService from "@/server/services/competitive.service";
import { 
  BalanceMetric, 
  PlayerData, 
  GameMode, 
  BalancedTeamResult 
} from "@/lib/team-balance/types";
import { getPlayerWeight } from "@/lib/team-balance/metrics";
import { generateTeams } from "@/lib/team-balance/balancer";
import { mulberry32, parseSeed } from "@/lib/team-balance/rng";

/**
 * Retorna todos os Tracked Players ativos unificados com suas estatísticas da temporada.
 */
export async function getAvailablePlayers(): Promise<PlayerData[]> {
  // 1. Busca todos os jogadores monitorados ativos
  const activePlayers = await prisma.player.findMany({
    where: {
      trackedPlayer: {
        active: true,
      },
    },
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      levelGc: true,
    },
    orderBy: {
      nickname: "asc",
    },
  });

  // 2. Carrega as estatísticas do CompetitiveService
  const dataset = await competitiveService.loadCompetitiveDataset();
  const bundle = await competitiveService.getDashboardCompetitiveBundle(dataset);
  
  // Mapeia os dados do monitoredPlayers por ID para busca rápida
  const monitoredByPlayerId = new Map(bundle.monitoredPlayers.map((p) => [p.player.id, p]));

  // Resolve os arquétipos competitivos dos jogadores
  const archetypes = competitiveService.getPlayerArchetypesFromDataset(dataset);
  const archetypeByPlayerId = new Map(archetypes.map((a) => [a.player.id, a]));

  // 3. Consolida os dados e aplica fallbacks
  return activePlayers.map((p) => {
    const stats = monitoredByPlayerId.get(p.id);
    const arch = archetypeByPlayerId.get(p.id);
    
    return {
      id: p.id,
      name: p.nickname,
      avatarUrl: p.avatarUrl,
      levelGc: p.levelGc ?? 1,
      rating: stats?.rating ?? 1.00,
      adr: stats?.adr ?? 75.0,
      kd: stats?.kd ?? 1.00,
      winrate: stats?.winrate ?? 50.0,
      role: arch?.label ?? "Versátil",
      guest: false,
    };
  });
}

/**
 * Salva o resultado de um sorteio de balanceamento de forma relacional no banco.
 */
export async function saveBalance(params: {
  seed: string;
  mode: GameMode;
  metric: BalanceMetric;
  difference: number;
  ct: PlayerData[];
  tr: PlayerData[];
}) {
  const { seed, mode, metric, difference, ct, tr } = params;

  return prisma.$transaction(async (tx) => {
    // 1. Cria a partida
    const match = await tx.teamBalanceMatch.create({
      data: {
        seed,
        mode,
        metric,
        difference,
      },
    });

    // 2. Prepara os jogadores associados
    const dbPlayers = [
      ...ct.map((p) => ({
        matchId: match.id,
        playerId: p.guest ? null : p.id || null,
        nickname: p.name,
        avatar: p.avatarUrl || null,
        team: "CT",
        weight: getPlayerWeight(p, metric),
        guest: !!p.guest,
      })),
      ...tr.map((p) => ({
        matchId: match.id,
        playerId: p.guest ? null : p.id || null,
        nickname: p.name,
        avatar: p.avatarUrl || null,
        team: "TR",
        weight: getPlayerWeight(p, metric),
        guest: !!p.guest,
      }))
    ];

    // 3. Salva os jogadores em lote
    await tx.teamBalancePlayer.createMany({
      data: dbPlayers,
    });

    return tx.teamBalanceMatch.findUnique({
      where: { id: match.id },
      include: {
        players: true,
      },
    });
  });
}

/**
 * Atualiza o vencedor ("CT" | "TR" | "DRAW" | null) de uma partida de balanceamento.
 */
export async function updateMatchWinner(matchId: string, winner: string | null) {
  return prisma.teamBalanceMatch.update({
    where: { id: matchId },
    data: { winner },
  });
}

/**
 * Busca histórico de balanceamentos paginados.
 */
export async function getHistory(limit: number = 20, offset: number = 0) {
  const matches = await prisma.teamBalanceMatch.findMany({
    take: limit,
    skip: offset,
    include: {
      players: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const total = await prisma.teamBalanceMatch.count();

  return {
    matches,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

/**
 * Exclui um registro de balanceamento.
 */
export async function deleteBalance(id: string) {
  return prisma.teamBalanceMatch.delete({
    where: { id },
  });
}

/**
 * Re-executa o balanceamento com base na seed e nos jogadores originais.
 */
export async function replayBalance(params: {
  seed: string;
  mode: GameMode;
  metric: BalanceMetric;
  players: PlayerData[];
}): Promise<BalancedTeamResult> {
  const { seed, mode, metric, players } = params;
  const seedNum = parseSeed(seed);
  const rng = mulberry32(seedNum);
  return generateTeams(players, mode, metric, rng);
}
