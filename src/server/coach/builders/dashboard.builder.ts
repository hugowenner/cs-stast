import fs from "fs";
import path from "path";
import { cleanMapName } from "@/lib/utils";
import { getDashboardSummary } from "@/server/services/dashboard.service";

function loadTemplate(name: string): string {
  const templatePath = path.join(process.cwd(), "src/server/coach/templates", `${name}.md`);
  return fs.readFileSync(templatePath, "utf-8");
}

export function sanitizeText(str: string | null | undefined): string {
  if (!str) return "N/A";
  // Remove quebras de linha e caracteres de controle para isolar os dados estritamente em uma única linha
  let clean = String(str).replace(/[\r\n\t\x00-\x1F\x7F]/g, " ").trim();
  // Neutraliza delimitadores markdown de bloco de código para evitar quebra estrutural do prompt
  clean = clean.replace(/```/g, "'''");
  // Limita tamanho para evitar inundações de contexto
  if (clean.length > 80) clean = clean.substring(0, 80);
  return clean;
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
  bestPlayer: {
    nickname: string;
    seasonScore: number;
    rawRating: number;
    matchesPlayed: number;
  } | null;
  notablePlayers: Array<{
    nickname: string;
    rawRating: number;
    matchesPlayed: number;
  }>;
  telemetry: {
    entryKillsTotal: number;
    hasOpeningWinrateTelemetry: boolean;
    hasClutchTelemetry: boolean;
    hasTradeTelemetry: boolean;
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
    if (typeof compService?.getGroupRadarFromDataset === "function" && dataset?.allStats) {
      radar = compService.getGroupRadarFromDataset(dataset, [], null);
    }
  } catch {
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

  const allStats = Array.isArray(dataset?.allStats) ? dataset.allStats : [];
  const activePlayers = Array.isArray(dataset?.activePlayers) ? dataset.activePlayers : [];
  const statsByPlayer = dataset?.statsByPlayer instanceof Map ? dataset.statsByPlayer : new Map();

  // 1. Map Pool Coletivo Exato (calculado sobre as partidas coletivas elegíveis, mesma regra do Radar)
  const collectiveMatchMap = new Map<string, { mapName: string; won: boolean }>();
  for (const stat of allStats) {
    const matchStats = allStats.filter((st: any) => st.matchId === stat.matchId);
    const sameTeam = matchStats.filter((st: any) => st.team === stat.team);
    const opposing = matchStats.filter((st: any) => st.team !== stat.team);
    // Partida coletiva elegível: >= 2 monitorados no mesmo time e nenhum no time oposto
    if (opposing.length === 0 && sameTeam.length >= 2) {
      if (!collectiveMatchMap.has(stat.matchId)) {
        const won =
          (stat.team === "A" && stat.match.scoreTeamA > stat.match.scoreTeamB) ||
          (stat.team === "B" && stat.match.scoreTeamB > stat.match.scoreTeamA);
        collectiveMatchMap.set(stat.matchId, {
          mapName: stat.match.map?.name ?? "Desconhecido",
          won,
        });
      }
    }
  }

  const mapCountMap = new Map<string, { total: number; wins: number }>();
  for (const { mapName, won } of collectiveMatchMap.values()) {
    const entry = mapCountMap.get(mapName) ?? { total: 0, wins: 0 };
    entry.total++;
    if (won) entry.wins++;
    mapCountMap.set(mapName, entry);
  }

  const collectiveMapPool = Array.from(mapCountMap.entries())
    .map(([mapName, data]) => ({
      name: mapName,
      cleanMapName: cleanMapName(mapName),
      matchesPlayed: data.total,
      wins: data.wins,
      losses: data.total - data.wins,
      winrate: data.total > 0 ? Math.round((data.wins / data.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.matchesPlayed - a.matchesPlayed || b.winrate - a.winrate);

  // 2. Telemetria
  let totalEntryKills = 0;
  let totalEntryDeaths = 0;
  let totalTrades = 0;
  let totalClutches = 0;

  for (const s of allStats) {
    totalEntryKills += s.entryKills ?? 0;
    totalEntryDeaths += s.entryDeaths ?? 0;
    totalTrades += s.tradeKills ?? 0;
    totalClutches += s.clutchesWon ?? 0;
  }

  // 3. Jogadores com volume de partidas
  const playersSummary: Array<{ nickname: string; rawRating: number; matchesPlayed: number }> = [];
  for (const p of activePlayers) {
    const pStats = statsByPlayer.get(p.id) ?? [];
    if (pStats.length > 0) {
      const avgRawRating =
        pStats.reduce((sum: number, s: any) => sum + (s.rating ?? 0), 0) / pStats.length;
      playersSummary.push({
        nickname: p.nickname,
        rawRating: avgRawRating,
        matchesPlayed: pStats.length,
      });
    }
  }
  playersSummary.sort((a, b) => b.matchesPlayed - a.matchesPlayed);

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
    mapPool: collectiveMapPool,
    bestPlayer: summary.bestPlayer
      ? {
          nickname: summary.bestPlayer.nickname,
          seasonScore: summary.bestPlayer.rating, // Season Score 3.5 ajustado/oficial
          rawRating: summary.bestPlayer.rawRating ?? summary.bestPlayer.rating, // Rating 2.0 médio bruto
          matchesPlayed: summary.bestPlayer.matchesPlayed,
        }
      : null,
    notablePlayers: playersSummary.slice(0, 4),
    telemetry: {
      entryKillsTotal: totalEntryKills,
      hasOpeningWinrateTelemetry: totalEntryDeaths > 0,
      hasClutchTelemetry: totalClutches > 0,
      hasTradeTelemetry: totalTrades > 0,
    },
    community: summary.community,
    dominantMap: summary.dominantMap,
  };
}

export function formatDashboardContextPayload(dto: any): string {
  const lines: string[] = [];
  const seasonLabel = sanitizeText(dto.seasonLabel || "Temporada Atual");

  // 1. Universo e Amostragem
  lines.push("1. UNIVERSO DE PARTIDAS E COMPOSIÇÃO:");
  lines.push(`- Temporada: ${seasonLabel}`);

  if (dto.universe) {
    const u = dto.universe;
    lines.push(`- Universo total de partidas registradas: ${u.totalMatches} partidas.`);
    lines.push(
      `- Recorte coletivo (base do radar): ${u.collectiveMatches} partidas únicas com 2+ monitorados no mesmo time (${u.fullTeamMatches} com 5 monitorados no mesmo time, ${u.smallTeamMatches} com 2 a 4 monitorados).`
    );
    lines.push(
      `- Partidas fora do recorte coletivo: ${u.soloMatches} individuais/solo (1 monitorado) e ${u.confrontationMatches} confronto(s) direto(s) entre monitorados em lados opostos (excluídos do cálculo coletivo para evitar distorção).`
    );
    lines.push(`- Jogadores monitorados ativos: ${u.activePlayersCount} cadastrados.`);
    lines.push(
      `- Sessões da plataforma (agrupamento por data/sessão da GC, horário UTC): ${u.totalSessions} sessões (média de ${u.avgMatchesPerSession.toFixed(1)} partidas/sessão; não interpretar como noites de jogo).`
    );
  } else {
    lines.push(`- Total de partidas: ${dto.totalMatches ?? "N/A"}`);
    lines.push(`- Jogadores ativos: ${dto.totalPlayers ?? "N/A"}`);
    lines.push(`- Sessões registradas: ${dto.totalSessions ?? "N/A"}`);
  }

  // 2. Momento Coletivo Recente
  lines.push("\n2. MOMENTO COLETIVO RECENTE (APENAS PARTIDAS COLETIVAS COM 2+ NO MESMO TIME):");
  if (dto.squadMomentum) {
    const sm = dto.squadMomentum;
    if (sm.sampleStatus === "insufficient") {
      lines.push(
        `- Amostra em formação: apenas ${sm.eligibleMatchesCount} partidas coletivas registradas. Amostra insuficiente para comparação estatística de blocos de 10 jogos. O coach deve destacar que o ciclo está no início.`
      );
    } else if (sm.sampleStatus === "partial" && sm.recentBlock) {
      const rb = sm.recentBlock;
      const range = rb.formattedRange ? ` (período: ${rb.formattedRange})` : "";
      lines.push(
        `- Últimas 10 partidas coletivas${range}: ${rb.wins} vitórias, ${rb.ties} empates e ${rb.losses} derrotas (${rb.winrate}% aproveitamento, saldo de rounds: ${rb.roundDiff > 0 ? `+${rb.roundDiff}` : rb.roundDiff}).`
      );
      lines.push("- Bloco anterior: Amostra insuficiente (< 20 partidas) para bloco comparativo.");
    } else if (sm.sampleStatus === "full" && sm.recentBlock && sm.previousBlock) {
      const rb = sm.recentBlock;
      const pb = sm.previousBlock;
      const rangeR = rb.formattedRange ? ` (período: ${rb.formattedRange})` : "";
      const rangeP = pb.formattedRange ? ` (período: ${pb.formattedRange})` : "";
      lines.push(
        `- Últimas 10 partidas coletivas${rangeR}: ${rb.wins} vitórias, ${rb.ties} empates e ${rb.losses} derrotas (${rb.winrate}% aproveitamento, saldo de rounds: ${rb.roundDiff > 0 ? `+${rb.roundDiff}` : rb.roundDiff}).`
      );
      lines.push(
        `- Bloco de 10 partidas anteriores${rangeP}: ${pb.wins} vitórias, ${pb.ties} empates e ${pb.losses} derrotas (${pb.winrate}% aproveitamento, saldo de rounds: ${pb.roundDiff > 0 ? `+${pb.roundDiff}` : pb.roundDiff}).`
      );
      const diffStr =
        sm.diffPp !== null
          ? `${sm.diffPp > 0 ? `+${sm.diffPp}` : sm.diffPp} pontos percentuais (p.p.)`
          : "0 p.p.";
      lines.push(
        `- Variação entre blocos: ${diffStr} no aproveitamento. (Nota: saldo de rounds negativo acumulado não permite deduzir se vitórias foram apertadas ou derrotas elásticas).`
      );
    }
  } else {
    lines.push("- Dados de momento coletivo não fornecidos.");
  }

  // 3. Map Pool Coletivo
  lines.push("\n3. MAP POOL COLETIVO (EXCLUSIVAMENTE PARTIDAS COLETIVAS COM 2+ NO MESMO TIME):");
  if (dto.mapPool && dto.mapPool.length > 0) {
    const totalCollectiveMapMatches = dto.mapPool.reduce(
      (sum: number, m: any) => sum + m.matchesPlayed,
      0
    );
    lines.push(
      `Distribuição das ${totalCollectiveMapMatches} partidas coletivas por mapa (ordenadas por volume):`
    );
    for (const m of dto.mapPool) {
      const sampleNote =
        m.matchesPlayed < 5
          ? " [amostra pequena/inicial]"
          : m.matchesPlayed >= 20
          ? " [amostra sólida]"
          : "";
      lines.push(
        `- ${sanitizeText(m.cleanMapName || m.name)}: ${m.matchesPlayed} partidas (${m.wins}V - ${m.losses}D, ${m.winrate}% WR)${sampleNote}`
      );
    }
    lines.push(
      "- Nota Metodológica: Mapas com poucas partidas (< 5) não devem receber conclusões definitivas. Winrate baixo não permite deduzir falhas específicas de bombsite ou posicionamento."
    );
  } else if (dto.dominantMap) {
    lines.push(
      `- Mapa mais jogado: ${sanitizeText(dto.dominantMap.name)} com ${dto.dominantMap.count} partidas (${dto.dominantMap.percentage}% do total).`
    );
  } else {
    lines.push("- Sem registros de mapas na amostra coletiva.");
  }

  // 4. Destaques Individuais
  lines.push("\n4. PARTICIPAÇÃO INDIVIDUAL (COM DENOMINADORES E INDICADORES CLAROS):");
  if (dto.bestPlayer) {
    const scoreVal = dto.bestPlayer.seasonScore ?? dto.bestPlayer.rating ?? 0;
    const rawVal = dto.bestPlayer.rawRating ?? dto.bestPlayer.rating ?? scoreVal;
    lines.push(
      `- Líder da classificação oficial (Season Score 3.5 com ajuste bayesiano): ${sanitizeText(dto.bestPlayer.nickname)} — Score: ${scoreVal.toFixed(2)} (Rating 2.0 médio bruto: ${rawVal.toFixed(2)} em ${dto.bestPlayer.matchesPlayed} partidas).`
    );
  }
  if (dto.notablePlayers && dto.notablePlayers.length > 0) {
    lines.push("Outros jogadores com volume elevado de partidas no período:");
    for (const p of dto.notablePlayers) {
      if (p.nickname !== dto.bestPlayer?.nickname) {
        const rawVal = p.rawRating ?? p.rating ?? 0;
        lines.push(
          `- ${sanitizeText(p.nickname)}: Rating 2.0 médio bruto ${rawVal.toFixed(2)} em ${p.matchesPlayed} partidas.`
        );
      }
    }
  }
  lines.push(
    "- Nota Metodológica: O volume de partidas é individual. Os jogadores atuam em grupos variáveis e NÃO formam uma escalação fixa. Rating médio mede desempenho agregado, não regularidade."
  );

  // 5. Telemetria e Cobertura
  lines.push("\n5. DISPONIBILIDADE E LIMITAÇÕES DE TELEMETRIA:");
  const entryKills = dto.telemetry?.entryKillsTotal ?? 0;
  if (entryKills > 0) {
    lines.push(
      `- First Kills (Aberturas): ${entryKills} eliminações de abertura registradas na temporada (campo disponível).`
    );
  } else {
    lines.push("- First Kills (Aberturas): Zero ou não coletado no período.");
  }

  if (!dto.telemetry?.hasOpeningWinrateTelemetry) {
    lines.push(
      "- Opening Winrate (% vitórias em duelos de abertura): INDISPONÍVEL. As mortes de abertura (First Deaths) não foram coletadas nas súmulas, impossibilitando calcular taxa de conversão de aberturas."
    );
  }

  if (!dto.telemetry?.hasClutchTelemetry) {
    lines.push(
      "- Clutches (1vX): Eventos de 1vX zerados/não registrados nas súmulas GC deste período. NÃO inferir incapacidade do grupo em clutches."
    );
  }

  if (!dto.telemetry?.hasTradeTelemetry) {
    lines.push("- Trade Kills: Eventos de trade zerados/não registrados nas súmulas deste período.");
  }

  lines.push(
    "- Utilitárias e Comunicação: Dados de granadas e áudio NÃO constam em súmulas. É estritamente proibido presumir falhas de utilitária, mira ou comunicação sem evidência de demo."
  );

  return lines.join("\n");
}

export function buildDashboardPrompt(dto: any): string {
  const template = loadTemplate("dashboard");
  const vocabulary = loadTemplate("vocabulary");
  const contextPayload = formatDashboardContextPayload(dto);
  return template
    .replace("{{contextPayload}}", contextPayload)
    .replace("{{VOCABULARY}}", vocabulary);
}
