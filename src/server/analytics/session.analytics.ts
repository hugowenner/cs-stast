import { calculateKD, calculateHSPercentage, calculateWinrate } from "./player.analytics";
import type {
  SessionSummaryDTO,
  SessionInsightDTO,
  SessionTimelineEventDTO,
  SessionTrendItemDTO,
  SessionHighlightDTO,
  SessionPlayerDTO,
  SessionMapDTO,
} from "@/server/dtos/sessionSummary.dto";

export interface SessionInsightProvider {
  getInsights(summary: Omit<SessionSummaryDTO, "insights">): SessionInsightDTO[];
}

export class RuleBasedSessionInsightProvider implements SessionInsightProvider {
  getInsights(summary: Omit<SessionSummaryDTO, "insights">): SessionInsightDTO[] {
    const insights: SessionInsightDTO[] = [];

    // 1. Insight de ELO/Resultado Geral
    const { wins, losses, eloChangeGroup, totalMatches } = summary.overview;
    if (eloChangeGroup > 40) {
      insights.push({
        type: "positive",
        severity: "high",
        title: "Noite Altamente Lucrativa!",
        description: `O time teve um saldo excelente de +${eloChangeGroup} ELO ao longo de ${totalMatches} partidas, com aproveitamento de ${wins}V - ${losses}D.`,
      });
    } else if (eloChangeGroup < -30) {
      insights.push({
        type: "negative",
        severity: "high",
        title: "Dreno de ELO",
        description: `Sessão difícil com perda acumulada de ${eloChangeGroup} ELO. Ajustes de lineup ou foco tático são recomendados para a próxima noite.`,
      });
    }

    // 2. Insight de Mapas Dominantes
    const bestMap = [...summary.maps].sort((a, b) => b.winrate - a.winrate || b.matchesPlayed - a.matchesPlayed)[0];
    if (bestMap && bestMap.winrate >= 75 && bestMap.matchesPlayed >= 2) {
      insights.push({
        type: "positive",
        severity: "medium",
        title: `Fortaleza no Mapa: ${bestMap.mapName}`,
        description: `A equipe dominou completamente o mapa ${bestMap.mapName} nesta sessão, vencendo ${bestMap.wins} de ${bestMap.matchesPlayed} partidas (${bestMap.winrate}% winrate).`,
      });
    }

    const worstMap = [...summary.maps].sort((a, b) => a.winrate - b.winrate || b.matchesPlayed - a.matchesPlayed)[0];
    if (worstMap && worstMap.winrate <= 25 && worstMap.matchesPlayed >= 2) {
      insights.push({
        type: "negative",
        severity: "medium",
        title: `Ponto Crítico: ${worstMap.mapName}`,
        description: `O mapa ${worstMap.mapName} foi o calcanhar de Aquiles da noite, com apenas ${worstMap.winrate}% de winrate em ${worstMap.matchesPlayed} partidas.`,
      });
    }

    // 3. Destaque de Jogador
    const mvpHighlight = summary.highlights.find((h) => h.category === "mvp");
    if (mvpHighlight) {
      insights.push({
        type: "neutral",
        severity: "medium",
        title: `Liderança Técnica`,
        description: `${mvpHighlight.playerName} foi o destaque estatístico da noite com um Rating médio excepcional de ${mvpHighlight.value}.`,
      });
    }

    // 4. Sinergia de Dupla
    if (summary.bestDuo && (summary.bestDuo.wins >= 2)) {
      insights.push({
        type: "positive",
        severity: "low",
        title: "Dupla do Servidor",
        description: `${summary.bestDuo.playerAName} e ${summary.bestDuo.playerBName} mostraram grande entrosamento, jogando juntos com aproveitamento de ${summary.bestDuo.wins}V - ${summary.bestDuo.losses}D.`,
      });
    }

    return insights;
  }
}

export interface RawMatchData {
  id: string;
  playedAt: Date;
  scoreTeamA: number;
  scoreTeamB: number;
  map: { name: string };
  playerStats: {
    playerId: string;
    team: string; // "A" ou "B"
    rating: number;
    adr: number;
    kast: number;
    kills: number;
    deaths: number;
    assists: number;
    headshots: number;
    eloBefore: number;
    eloAfter: number;
    player: {
      id: string;
      nickname: string;
      avatarUrl: string | null;
      trackedPlayer: { active: boolean } | null;
    };
  }[];
}

export function computeSmartSession(
  session: { id: string; name: string | null; date: Date },
  matches: RawMatchData[],
  playerCareerAverages: { [playerId: string]: { rating: number; adr: number; hs: number; winrate: number } }
): Omit<SessionSummaryDTO, "insights"> {
  // Ordenar partidas cronologicamente
  const sortedMatches = [...matches].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

  // 1. Overview & Geral
  let totalMatches = sortedMatches.length;
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let eloChangeGroup = 0;
  let totalRating = 0;
  let totalAdr = 0;
  let totalKills = 0;
  let totalDeaths = 0;
  let totalHeadshots = 0;
  let groupStatsCount = 0;

  // Mapas e Jogadores acumuladores
  const playerStatsMap = new Map<string, {
    nickname: string;
    avatarUrl: string | null;
    kills: number;
    deaths: number;
    assists: number;
    headshots: number;
    ratingSum: number;
    adrSum: number;
    kastSum: number;
    matchesPlayed: number;
    eloStart: number;
    eloEnd: number;
  }>();

  const mapStatsMap = new Map<string, { matchesPlayed: number; wins: number; losses: number }>();

  // Auxiliar para detectar a melhor dupla
  const duoMatchesMap = new Map<string, { wins: number; losses: number }>();

  // Acontecimentos / Timeline
  const timeline: SessionTimelineEventDTO[] = [];
  let winStreak = 0;
  let maxWinStreak = 0;

  sortedMatches.forEach((match, idx) => {
    // Jogadores monitorados ativos nesta partida
    const groupStats = match.playerStats.filter((s) => !!s.player.trackedPlayer?.active);
    if (groupStats.length === 0) return;

    let winsForGroup = 0;
    let lossesForGroup = 0;

    // Calcular ELO e médias
    groupStats.forEach((stat) => {
      const scoreSelf = stat.team === "A" ? match.scoreTeamA : match.scoreTeamB;
      const scoreOpp = stat.team === "A" ? match.scoreTeamB : match.scoreTeamA;

      eloChangeGroup += stat.eloAfter - stat.eloBefore;
      totalRating += stat.rating;
      totalAdr += stat.adr;
      totalKills += stat.kills;
      totalDeaths += stat.deaths;
      totalHeadshots += stat.headshots;
      groupStatsCount++;

      if (scoreSelf > scoreOpp) winsForGroup++;
      else if (scoreSelf < scoreOpp) lossesForGroup++;

      // Acumulador do jogador
      const cur = playerStatsMap.get(stat.playerId) ?? {
        nickname: stat.player.nickname,
        avatarUrl: stat.player.avatarUrl,
        kills: 0,
        deaths: 0,
        assists: 0,
        headshots: 0,
        ratingSum: 0,
        adrSum: 0,
        kastSum: 0,
        matchesPlayed: 0,
        eloStart: stat.eloBefore,
        eloEnd: stat.eloAfter,
      };

      cur.kills += stat.kills;
      cur.deaths += stat.deaths;
      cur.assists += stat.assists;
      cur.headshots += stat.headshots;
      cur.ratingSum += stat.rating;
      cur.adrSum += stat.adr;
      cur.kastSum += stat.kast;
      cur.matchesPlayed++;
      cur.eloEnd = stat.eloAfter; // Atualiza com o ELO final
      playerStatsMap.set(stat.playerId, cur);
    });

    // Registrar dupla jogando juntos
    for (let i = 0; i < groupStats.length; i++) {
      for (let j = i + 1; j < groupStats.length; j++) {
        const p1 = groupStats[i];
        const p2 = groupStats[j];
        if (p1.team === p2.team) {
          const names = [p1.player.nickname, p2.player.nickname].sort();
          const duoKey = `${names[0]} & ${names[1]}`;
          const duoCur = duoMatchesMap.get(duoKey) ?? { wins: 0, losses: 0 };
          
          const scoreSelf = p1.team === "A" ? match.scoreTeamA : match.scoreTeamB;
          const scoreOpp = p1.team === "A" ? match.scoreTeamB : match.scoreTeamA;
          if (scoreSelf > scoreOpp) duoCur.wins++;
          else if (scoreSelf < scoreOpp) duoCur.losses++;
          
          duoMatchesMap.set(duoKey, duoCur);
        }
      }
    }

    // Resultado do grupo nesta partida
    let matchOutcome: "win" | "loss" | "tie" = "tie";
    if (winsForGroup > lossesForGroup) {
      matchOutcome = "win";
      wins++;
      winStreak++;
      if (winStreak > maxWinStreak) maxWinStreak = winStreak;
    } else if (winsForGroup < lossesForGroup) {
      matchOutcome = "loss";
      losses++;
      winStreak = 0;
    } else {
      if (match.scoreTeamA === match.scoreTeamB) {
        matchOutcome = "tie";
        ties++;
      } else {
        matchOutcome = "win";
        wins++;
      }
      winStreak = 0;
    }

    // Acumulador de Mapas
    const mapName = match.map.name;
    const curMap = mapStatsMap.get(mapName) ?? { matchesPlayed: 0, wins: 0, losses: 0 };
    curMap.matchesPlayed++;
    if (matchOutcome === "win") curMap.wins++;
    else if (matchOutcome === "loss") curMap.losses++;
    mapStatsMap.set(mapName, curMap);

    // Evento de Timeline
    const timeStr = match.playedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const outcomeLabel = matchOutcome === "win" ? "Vitória" : matchOutcome === "loss" ? "Derrota" : "Empate";
    timeline.push({
      timestamp: match.playedAt.toISOString(),
      type: "match",
      title: `${outcomeLabel} no ${mapName}`,
      description: `Placar final: ${match.scoreTeamA} x ${match.scoreTeamB}. Rating médio do time: ${(groupStats.reduce((s, st) => s + st.rating, 0) / groupStats.length).toFixed(2)}.`,
      outcome: matchOutcome,
      matchId: match.id,
    });

    // Marco: Sequência de Vitórias
    if (winStreak === 3) {
      timeline.push({
        timestamp: new Date(match.playedAt.getTime() + 1000).toISOString(),
        type: "milestone",
        title: "🔥 Racha de Vitórias!",
        description: "O time embalou a terceira vitória consecutiva na sessão.",
      });
    }
  });

  // Evento de Fim de Sessão
  if (sortedMatches.length > 0) {
    const lastMatch = sortedMatches[sortedMatches.length - 1];
    timeline.push({
      timestamp: new Date(lastMatch.playedAt.getTime() + 5 * 60 * 1000).toISOString(),
      type: "milestone",
      title: "🏁 Fim da Sessão",
      description: `Sessão concluída com ${totalMatches} partidas disputadas.`,
    });
  }

  // Winrate
  const winrate = calculateWinrate(wins, wins + losses);

  // Humor da Sessão (Mood Heuristics)
  let mood: SessionSummaryDTO["metadata"]["mood"] = "stable";
  if (winrate >= 70 && eloChangeGroup > 0) mood = "excellent";
  else if (winrate >= 50 && eloChangeGroup >= 0) mood = "good";
  else if (winrate < 50 && eloChangeGroup < 0) mood = "difficult";
  if (winrate < 30 && eloChangeGroup <= -35) mood = "disaster";

  // Formatar Players DTO
  const players: SessionPlayerDTO[] = Array.from(playerStatsMap.entries()).map(([id, p]) => {
    return {
      id,
      nickname: p.nickname,
      avatarUrl: p.avatarUrl,
      ratingAvg: Math.round((p.ratingSum / p.matchesPlayed) * 100) / 100,
      adrAvg: Math.round((p.adrSum / p.matchesPlayed) * 10) / 10,
      hsPercentage: Math.round(calculateHSPercentage(p.headshots, p.kills) * 10) / 10,
      kd: calculateKD(p.kills, p.deaths),
      matchesPlayed: p.matchesPlayed,
      eloChange: p.eloEnd - p.eloStart,
    };
  });

  // Formatar Mapas DTO
  const mapsDTO: SessionMapDTO[] = Array.from(mapStatsMap.entries()).map(([mapName, m]) => ({
    mapName,
    matchesPlayed: m.matchesPlayed,
    wins: m.wins,
    losses: m.losses,
    winrate: calculateWinrate(m.wins, m.matchesPlayed),
  })).sort((a, b) => b.matchesPlayed - a.matchesPlayed);

  // Destaques da Noite (Highlights)
  const highlights: SessionHighlightDTO[] = [];
  if (players.length > 0) {
    // MVP
    const bestRatingPlayer = [...players].sort((a, b) => b.ratingAvg - a.ratingAvg)[0];
    highlights.push({
      category: "mvp",
      label: "Melhor Rating",
      playerName: bestRatingPlayer.nickname,
      playerAvatar: bestRatingPlayer.avatarUrl,
      value: bestRatingPlayer.ratingAvg.toFixed(2),
    });

    // ADR
    const bestAdrPlayer = [...players].sort((a, b) => b.adrAvg - a.adrAvg)[0];
    highlights.push({
      category: "adr",
      label: "Poder de Fogo (ADR)",
      playerName: bestAdrPlayer.nickname,
      playerAvatar: bestAdrPlayer.avatarUrl,
      value: bestAdrPlayer.adrAvg.toFixed(1),
    });

    // HS%
    const bestHsPlayer = [...players].sort((a, b) => b.hsPercentage - a.hsPercentage)[0];
    highlights.push({
      category: "hs",
      label: "Mira da Noite (HS%)",
      playerName: bestHsPlayer.nickname,
      playerAvatar: bestHsPlayer.avatarUrl,
      value: `${bestHsPlayer.hsPercentage.toFixed(1)}%`,
    });

    // K/D
    const bestKdPlayer = [...players].sort((a, b) => b.kd - a.kd)[0];
    highlights.push({
      category: "clutch",
      label: "Sobrevivente (K/D)",
      playerName: bestKdPlayer.nickname,
      playerAvatar: bestKdPlayer.avatarUrl,
      value: bestKdPlayer.kd.toFixed(2),
    });

    // ELO Evolution
    const bestEloPlayer = [...players].sort((a, b) => b.eloChange - a.eloChange)[0];
    highlights.push({
      category: "evolution",
      label: "Maior Subida (ELO)",
      playerName: bestEloPlayer.nickname,
      playerAvatar: bestEloPlayer.avatarUrl,
      value: (bestEloPlayer.eloChange >= 0 ? "+" : "") + bestEloPlayer.eloChange,
    });
  }

  // Tendências (Trends)
  const trends: SessionTrendItemDTO[] = [];
  if (players.length > 0) {
    // Calculamos a média geral da sessão do time
    const sessionRating = totalRating / Math.max(groupStatsCount, 1);
    const sessionAdr = totalAdr / Math.max(groupStatsCount, 1);
    const sessionHs = calculateHSPercentage(totalHeadshots, totalKills);

    // Média de carreira combinada dos jogadores participantes
    let careerRatingSum = 0;
    let careerAdrSum = 0;
    let careerHsSum = 0;
    let careerWinrateSum = 0;
    let careerPlayersCount = 0;

    players.forEach((p) => {
      const career = playerCareerAverages[p.id];
      if (career) {
        careerRatingSum += career.rating;
        careerAdrSum += career.adr;
        careerHsSum += career.hs;
        careerWinrateSum += career.winrate;
        careerPlayersCount++;
      }
    });

    const careerRating = careerPlayersCount > 0 ? careerRatingSum / careerPlayersCount : 1.0;
    const careerAdr = careerPlayersCount > 0 ? careerAdrSum / careerPlayersCount : 80;
    const careerHs = careerPlayersCount > 0 ? careerHsSum / careerPlayersCount : 40;
    const careerWinrate = careerPlayersCount > 0 ? careerWinrateSum / careerPlayersCount : 50;

    const getDirection = (sessionVal: number, careerVal: number) => {
      const diff = sessionVal - careerVal;
      if (diff > 0.02) return "up";
      if (diff < -0.02) return "down";
      return "stable";
    };

    trends.push({
      metric: "rating",
      label: "Rating Médio",
      direction: getDirection(sessionRating, careerRating),
      value: sessionRating.toFixed(2),
    });

    trends.push({
      metric: "adr",
      label: "ADR Médio",
      direction: getDirection(sessionAdr, careerAdr),
      value: sessionAdr.toFixed(1),
    });

    trends.push({
      metric: "hs",
      label: "Headshot %",
      direction: getDirection(sessionHs, careerHs),
      value: `${sessionHs.toFixed(1)}%`,
    });

    trends.push({
      metric: "winrate",
      label: "Taxa de Vitórias",
      direction: getDirection(winrate, careerWinrate),
      value: `${winrate.toFixed(1)}%`,
    });
  }

  // Melhor dupla
  let bestDuo: SessionSummaryDTO["bestDuo"] = null;
  let bestDuoWr = 0;
  for (const [duoKey, stats] of duoMatchesMap.entries()) {
    const total = stats.wins + stats.losses;
    if (total >= 2) {
      const wr = calculateWinrate(stats.wins, total);
      if (wr > bestDuoWr || (wr === bestDuoWr && total > (bestDuo ? bestDuo.wins + bestDuo.losses : 0))) {
        const [pA, pB] = duoKey.split(" & ");
        bestDuo = {
          playerAName: pA,
          playerBName: pB,
          wins: stats.wins,
          losses: stats.losses,
        };
        bestDuoWr = wr;
      }
    }
  }

  // Sinergia da sessão
  let totalSynergy = 75; // Baseline
  if (winrate >= 60) totalSynergy += 15;
  else if (winrate < 50) totalSynergy -= 15;
  if (eloChangeGroup > 40) totalSynergy += 10;
  else if (eloChangeGroup < -20) totalSynergy -= 10;
  const teamSynergy = Math.min(Math.max(totalSynergy, 20), 99);

  return {
    metadata: {
      id: session.id,
      name: session.name ?? `Sessão de ${session.date.toLocaleDateString("pt-BR")}`,
      date: session.date.toISOString(),
      mood,
    },
    overview: {
      totalMatches,
      wins,
      losses,
      ties,
      winrate,
      eloChangeGroup,
      ratingAvg: Math.round((groupStatsCount > 0 ? totalRating / groupStatsCount : 0) * 100) / 100,
      adrAvg: Math.round((groupStatsCount > 0 ? totalAdr / groupStatsCount : 0) * 10) / 10,
      hsPercentage: Math.round(calculateHSPercentage(totalHeadshots, totalKills) * 10) / 10,
      teamSynergy,
    },
    timeline,
    players,
    maps: mapsDTO,
    highlights,
    trends,
    bestDuo,
  };
}
