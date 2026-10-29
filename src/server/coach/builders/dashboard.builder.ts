import fs from "fs";
import path from "path";
import type { CompetitiveDataset } from "@/server/services/competitive.service";
import { getDashboardSummary } from "@/server/services/dashboard.service";

function loadTemplate(name: string): string {
  const templatePath = path.join(process.cwd(), "src/server/coach/templates", `${name}.md`);
  return fs.readFileSync(templatePath, "utf-8");
}

function sanitizeText(str: string | null | undefined): string {
  if (!str) return "N/A";
  return String(str).replace(/[\r\n]/g, " ").trim();
}

export interface DashboardCoachPayload {
  seasonId: string;
  seasonLabel: string;
  universe: {
    totalMatches: number;
    collectiveMatches: number;
    smallTeamMatches: number;
    fullTeamMatches: number;
    confrontationMatches: number;
    soloMatches: number;
    activePlayersCount: number;
    totalSessions: number;
    avgMatchesPerSession: number;
  };
  squadMomentum: {
    eligibleMatchesCount: number;
    sampleStatus: "full" | "partial" | "insufficient";
    recentBlock: {
      wins: number;
      losses: number;
      ties: number;
      winrate: number;
      roundDiff: number;
      formattedRange?: string;
    } | null;
    previousBlock: {
      wins: number;
      losses: number;
      ties: number;
      winrate: number;
      roundDiff: number;
      formattedRange?: string;
    } | null;
    diffPp: number | null;
  };
  mapPool: Array<{
    name: string;
    cleanMapName: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    winrate: number;
  }>;
  bestMap: {
    name: string;
    cleanMapName: string;
    matchesPlayed: number;
    winrate: number;
  } | null;
  worstMap: {
    name: string;
    cleanMapName: string;
    matchesPlayed: number;
    winrate: number;
  } | null;
  bestPlayer: {
    nickname: string;
    rating: number;
    matchesPlayed: number;
  } | null;
  notablePlayers: Array<{
    nickname: string;
    rating: number;
    matchesPlayed: number;
  }>;
  telemetry: {
    hasClutchTelemetry: boolean;
    hasDuelTelemetry: boolean;
  };
  community?: any;
  dominantMap?: any;
}

export async function loadDashboardCoachPayload(
  seasonId: string,
  seasonLabel: string,
  preloadedDataset?: any
): Promise<DashboardCoachPayload> {
  const compService = await import("@/server/services/competitive.service").catch(() => ({} as any));
  const dataset =
    preloadedDataset ??
    (typeof compService?.loadCompetitiveDataset === "function"
      ? await compService.loadCompetitiveDataset(seasonId)
      : null);
  const summary = await getDashboardSummary(seasonId, dataset);

  let radar: any = null;
  try {
    if (typeof compService.getGroupRadarFromDataset === "function" && dataset?.allStats) {
      radar = compService.getGroupRadarFromDataset(dataset, [], null);
    }
  } catch (err) {
    radar = null;
  }

  if (!radar) {
    radar = {
      matchComposition: {
        totalUniverse: summary?.totalMatches ?? 0,
        teamCount: 0,
        smallTeamCount: 0,
        fullTeamCount: 0,
        confrontationCount: 0,
        soloCount: 0,
      },
      recentParticipation: {
        totalActiveMonitored: summary?.totalPlayers ?? 0,
      },
      sessionPace: {
        totalEligibleSessions: summary?.totalSessions ?? 0,
        averageMatchesPerSession: 0,
      },
      squadMomentum: {
        eligibleMatchesCount: 0,
        sampleStatus: "insufficient" as const,
        recentBlock: null,
        previousBlock: null,
        diffPp: null,
      },
    };
  }

  let mapPerf: any = null;
  try {
    if (typeof compService.getMapPerformanceFromDataset === "function" && dataset?.allStats) {
      mapPerf = compService.getMapPerformanceFromDataset(dataset);
    }
  } catch {
    mapPerf = null;
  }

  if (!mapPerf) {
    mapPerf = { mapWinrates: [], bestMap: null, worstMap: null };
  }

  const allStats = Array.isArray(dataset?.allStats) ? dataset.allStats : [];
  const activePlayers = Array.isArray(dataset?.activePlayers) ? dataset.activePlayers : [];
  const statsByPlayer = dataset?.statsByPlayer instanceof Map ? dataset.statsByPlayer : new Map();

  const hasClutch = allStats.some((s) => (s.clutchesWon ?? 0) > 0);
  const hasDuel = allStats.some(
    (s) => (s.firstKills ?? 0) > 0 || (s.firstDeaths ?? 0) > 0
  );

  // Jogadores ativos com volume representativo (ordenados por matchesPlayed)
  const playersSummary: Array<{ nickname: string; rating: number; matchesPlayed: number }> = [];
  for (const p of activePlayers) {
    const stats = statsByPlayer.get(p.id) ?? [];
    if (stats.length > 0) {
      const avgRating = stats.reduce((sum: number, s: any) => sum + (s.rating ?? 0), 0) / stats.length;
      playersSummary.push({
        nickname: p.nickname,
        rating: avgRating,
        matchesPlayed: stats.length,
      });
    }
  }
  playersSummary.sort((a, b) => b.matchesPlayed - a.matchesPlayed);

  const eligibleMaps = (mapPerf.mapWinrates || [])
    .filter((m) => m.matchesPlayed >= 2)
    .map((m) => ({
      name: m.map,
      cleanMapName: m.cleanMapName,
      matchesPlayed: m.matchesPlayed,
      wins: m.wins,
      losses: m.losses,
      winrate: m.winrate,
    }));

  return {
    seasonId,
    seasonLabel,
    universe: {
      totalMatches: radar.matchComposition.totalUniverse,
      collectiveMatches: radar.matchComposition.teamCount,
      smallTeamMatches: radar.matchComposition.smallTeamCount,
      fullTeamMatches: radar.matchComposition.fullTeamCount,
      confrontationMatches: radar.matchComposition.confrontationCount,
      soloMatches: radar.matchComposition.soloCount,
      activePlayersCount: radar.recentParticipation.totalActiveMonitored,
      totalSessions: radar.sessionPace.totalEligibleSessions,
      avgMatchesPerSession: radar.sessionPace.averageMatchesPerSession,
    },
    squadMomentum: {
      eligibleMatchesCount: radar.squadMomentum.eligibleMatchesCount,
      sampleStatus: radar.squadMomentum.sampleStatus,
      recentBlock: radar.squadMomentum.recentBlock
        ? {
            wins: radar.squadMomentum.recentBlock.wins,
            losses: radar.squadMomentum.recentBlock.losses,
            ties: radar.squadMomentum.recentBlock.ties,
            winrate: radar.squadMomentum.recentBlock.winrate,
            roundDiff: radar.squadMomentum.recentBlock.roundDiff,
            formattedRange:
              radar.squadMomentum.recentBlock.startDate && radar.squadMomentum.recentBlock.endDate
                ? `${radar.squadMomentum.recentBlock.startDate} a ${radar.squadMomentum.recentBlock.endDate}`
                : undefined,
          }
        : null,
      previousBlock: radar.squadMomentum.previousBlock
        ? {
            wins: radar.squadMomentum.previousBlock.wins,
            losses: radar.squadMomentum.previousBlock.losses,
            ties: radar.squadMomentum.previousBlock.ties,
            winrate: radar.squadMomentum.previousBlock.winrate,
            roundDiff: radar.squadMomentum.previousBlock.roundDiff,
            formattedRange:
              radar.squadMomentum.previousBlock.startDate && radar.squadMomentum.previousBlock.endDate
                ? `${radar.squadMomentum.previousBlock.startDate} a ${radar.squadMomentum.previousBlock.endDate}`
                : undefined,
          }
        : null,
      diffPp: radar.squadMomentum.diffPp,
    },
    mapPool: eligibleMaps,
    bestMap: mapPerf.bestMap
      ? {
          name: mapPerf.bestMap.mapName,
          cleanMapName: mapPerf.bestMap.cleanMapName,
          matchesPlayed: mapPerf.bestMap.matchesPlayed,
          winrate: mapPerf.bestMap.winrate,
        }
      : null,
    worstMap: mapPerf.worstMap
      ? {
          name: mapPerf.worstMap.mapName,
          cleanMapName: mapPerf.worstMap.cleanMapName,
          matchesPlayed: mapPerf.worstMap.matchesPlayed,
          winrate: mapPerf.worstMap.winrate,
        }
      : null,
    bestPlayer: summary.bestPlayer
      ? {
          nickname: summary.bestPlayer.nickname,
          rating: summary.bestPlayer.rating,
          matchesPlayed: summary.bestPlayer.matchesPlayed,
        }
      : null,
    notablePlayers: playersSummary.slice(0, 4),
    telemetry: {
      hasClutchTelemetry: hasClutch,
      hasDuelTelemetry: hasDuel,
    },
    community: summary.community,
    dominantMap: summary.dominantMap,
  };
}

export function formatDashboardContextPayload(dto: any): string {
  const lines: string[] = [];

  const seasonLabel = sanitizeText(dto.seasonLabel || "Temporada Atual");

  // 1. Universo e Amostragem
  lines.push("1. UNIVERSO DE PARTIDAS E COMPOSIÇÃO DO GRUPO:");
  lines.push(`- Temporada: ${seasonLabel}`);

  if (dto.universe) {
    const u = dto.universe;
    lines.push(`- Total de partidas registradas no período: ${u.totalMatches}`);
    lines.push(
      `- Composição comprovada: ${u.collectiveMatches} coletivas com 2+ monitorados no mesmo time (${u.fullTeamMatches} com 5 monitorados no mesmo time, ${u.smallTeamMatches} com 2 a 4 monitorados no mesmo time), ${u.soloMatches} partidas individuais/solo e ${u.confrontationMatches} confrontos internos entre monitorados.`
    );
    lines.push(`- População ativa: ${u.activePlayersCount} jogadores monitorados.`);
    lines.push(
      `- Ritmo de sessões: ${u.totalSessions} sessões de jogo registradas (média de ${u.avgMatchesPerSession.toFixed(1)} partidas por sessão).`
    );
  } else {
    // Fallback legado
    lines.push(`- Total de partidas: ${dto.totalMatches ?? "N/A"}`);
    lines.push(`- Jogadores ativos: ${dto.totalPlayers ?? "N/A"}`);
    lines.push(`- Sessões registradas: ${dto.totalSessions ?? "N/A"}`);
  }

  // 2. Momento Coletivo Recente (Radar)
  lines.push("\n2. MOMENTO COLETIVO RECENTE (PARTIDAS COM 2+ MONITORADOS NO MESMO TIME):");
  if (dto.squadMomentum) {
    const sm = dto.squadMomentum;
    if (sm.sampleStatus === "insufficient") {
      lines.push(
        `- Amostra em formação: apenas ${sm.eligibleMatchesCount} partidas coletivas elegíveis registradas na temporada até o momento. Não há volume suficiente para comparação de blocos de 10 jogos. O coach deve destacar que o ciclo está em início.`
      );
    } else if (sm.sampleStatus === "partial" && sm.recentBlock) {
      const rb = sm.recentBlock;
      lines.push(
        `- Últimas 10 partidas coletivas: ${rb.wins} vitórias, ${rb.ties} empates e ${rb.losses} derrotas (${rb.winrate}% de aproveitamento coletivo, saldo de rounds: ${rb.roundDiff > 0 ? `+${rb.roundDiff}` : rb.roundDiff}).`
      );
      lines.push("- Bloco anterior: Amostra insuficiente (< 20 partidas) para bloco comparativo anterior.");
    } else if (sm.sampleStatus === "full" && sm.recentBlock && sm.previousBlock) {
      const rb = sm.recentBlock;
      const pb = sm.previousBlock;
      lines.push(
        `- Últimas 10 partidas coletivas: ${rb.wins} vitórias, ${rb.ties} empates e ${rb.losses} derrotas (${rb.winrate}% aproveitamento, saldo de rounds: ${rb.roundDiff > 0 ? `+${rb.roundDiff}` : rb.roundDiff}).`
      );
      lines.push(
        `- Bloco de 10 partidas anteriores: ${pb.wins} vitórias, ${pb.ties} empates e ${pb.losses} derrotas (${pb.winrate}% aproveitamento, saldo de rounds: ${pb.roundDiff > 0 ? `+${pb.roundDiff}` : pb.roundDiff}).`
      );
      const diffStr =
        sm.diffPp !== null
          ? `${sm.diffPp > 0 ? `+${sm.diffPp}` : sm.diffPp} pontos percentuais (p.p.)`
          : "estável";
      lines.push(
        `- Variação entre blocos: ${diffStr} no aproveitamento. (Atenção: uma variação de pontos percentuais não deve ser qualificada automaticamente como melhora ou piora substancial sem considerar a margem da amostra).`
      );
    }
  } else {
    lines.push("- Dados detalhados de blocos de momento coletivo não fornecidos.");
  }

  // 3. Map Pool e Aproveitamento
  lines.push("\n3. MAP POOL E APROVEITAMENTO COLETIVO:");
  if (dto.mapPool && dto.mapPool.length > 0) {
    lines.push("Mapas com amostra representativa (>= 2 partidas coletivas):");
    for (const m of dto.mapPool) {
      const isBest = dto.bestMap?.name === m.name;
      const isWorst = dto.worstMap?.name === m.name;
      const tag = isBest ? " [Maior aproveitamento]" : isWorst ? " [Pior aproveitamento]" : "";
      lines.push(
        `- ${sanitizeText(m.cleanMapName || m.name)}: ${m.matchesPlayed} partidas (${m.wins}V - ${m.losses}D, ${m.winrate}% WR)${tag}`
      );
    }
  } else if (dto.dominantMap) {
    lines.push(
      `- Mapa mais jogado: ${sanitizeText(dto.dominantMap.name)} com ${dto.dominantMap.count} partidas (${dto.dominantMap.percentage}% do total).`
    );
  } else {
    lines.push("- Sem dados de mapas com amostragem suficiente.");
  }

  // 4. Destaques Individuais (com denominadores claros)
  lines.push("\n4. DESTAQUES INDIVIDUAIS (RESPEITANDO DENOMINADORES E AMOSTRAS):");
  if (dto.bestPlayer) {
    lines.push(
      `- Líder da Temporada (Season Score oficial): ${sanitizeText(dto.bestPlayer.nickname)} — Rating ${Number(dto.bestPlayer.rating).toFixed(2)} em ${dto.bestPlayer.matchesPlayed} partidas registradas.`
    );
  }
  if (dto.notablePlayers && dto.notablePlayers.length > 0) {
    lines.push("Outros jogadores com participação relevante no período:");
    for (const p of dto.notablePlayers) {
      if (p.nickname !== dto.bestPlayer?.nickname) {
        lines.push(
          `- ${sanitizeText(p.nickname)}: Rating médio ${p.rating.toFixed(2)} em ${p.matchesPlayed} partidas.`
        );
      }
    }
  }
  lines.push(
    "- Nota Metodológica: O coach NÃO deve focar a análise inteira apenas no líder de Rating, nem julgar jogadores com amostras pequenas (< 3 partidas)."
  );

  // 5. Disponibilidade e Limitações de Telemetria
  lines.push("\n5. DISPONIBILIDADE E LIMITAÇÕES DE TELEMETRIA:");
  const hasClutch = dto.telemetry?.hasClutchTelemetry ?? false;
  if (!hasClutch) {
    lines.push(
      "- Clutches (1vX): Dados NÃO disponíveis/zerados na telemetria deste período. É expressamente PROIBIDO afirmar que o grupo falha em clutches."
    );
  } else {
    lines.push("- Clutches (1vX): Dados presentes na telemetria.");
  }

  const hasDuel = dto.telemetry?.hasDuelTelemetry ?? false;
  if (!hasDuel) {
    lines.push(
      "- Duelos de abertura / First Kills: Telemetria ausente ou não parseada neste período. NÃO faça afirmações sobre opening duels."
    );
  }

  lines.push(
    "- Utilitárias e Comunicação: Dados de granadas (smokes, flashes, molotovs) e comunicação de voz NÃO constam nas súmulas GC. É PROIBIDO presumir falhas de utilitária, mira ou comunicação sem evidência de demo."
  );

  return lines.join("\n");
}

export function buildDashboardPrompt(dto: any): string {
  const template = loadTemplate("dashboard");
  const contextPayload = formatDashboardContextPayload(dto);
  return template.replace("{{contextPayload}}", contextPayload);
}
