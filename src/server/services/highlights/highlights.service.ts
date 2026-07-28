import type { CompetitiveDataset } from "../competitive.service";
import { getMapSpecialistsFromDataset } from "../competitive.service";
import type { DashboardHighlight, HighlightPlayer, HighlightEvidenceMatch } from "./highlight.types";
import { calculateConfidence, calculateHighlightScore } from "./highlight.scoring";

/**
 * Auxiliar para verificar se o jogador venceu a partida representada pelo stat
 */
function isWin(s: { team: string; match: { scoreTeamA: number; scoreTeamB: number } }): boolean {
  return (
    (s.team === "A" && s.match.scoreTeamA > s.match.scoreTeamB) ||
    (s.team === "B" && s.match.scoreTeamB > s.match.scoreTeamA)
  );
}

/**
 * Cria a lista de evidências de partidas recentes para exibir em transmissão
 */
function getEvidenceForStats(stats: any[], count = 3): HighlightEvidenceMatch[] {
  return stats.slice(0, count).map((s) => {
    const scoreSelf = s.team === "A" ? s.match?.scoreTeamA ?? 0 : s.match?.scoreTeamB ?? 0;
    const scoreOpp = s.team === "A" ? s.match?.scoreTeamB ?? 0 : s.match?.scoreTeamA ?? 0;
    return {
      mapName: s.match?.map?.name ?? "Mapa",
      scoreSelf,
      scoreOpp,
      won: scoreSelf > scoreOpp,
    };
  });
}

export function generateHighlights(dataset: CompetitiveDataset): DashboardHighlight[] {
  const highlights: DashboardHighlight[] = [];
  const { activePlayers, statsByPlayer, allStats } = dataset;

  // 1. Processar Duplas: BEST_DUO, HOT_DUO, VOLUME_DUO (categoria: competitive)
  for (let i = 0; i < activePlayers.length; i++) {
    for (let j = i + 1; j < activePlayers.length; j++) {
      const pA = activePlayers[i];
      const pB = activePlayers[j];
      const statsA = statsByPlayer.get(pA.id) ?? [];
      const statsB = statsByPlayer.get(pB.id) ?? [];
      const statsBByMatch = new Map(statsB.map((s) => [s.matchId, s]));

      // Filtrar partidas jogadas juntos no mesmo time
      const sharedMatches: typeof statsA = [];
      for (const sA of statsA) {
        const sB = statsBByMatch.get(sA.matchId);
        if (sB && sA.team === sB.team) {
          sharedMatches.push(sA);
        }
      }

      const togetherTotal = sharedMatches.length;
      if (togetherTotal < 3) continue;

      let togetherWins = 0;
      let ratingSum = 0;
      for (const s of sharedMatches) {
        if (isWin(s)) togetherWins++;
        const sB = statsBByMatch.get(s.matchId)!;
        ratingSum += (s.rating + sB.rating) / 2;
      }

      const winrate = togetherWins / togetherTotal;
      const confidence = calculateConfidence(winrate, togetherTotal);
      const avgRating = ratingSum / togetherTotal;
      const players: HighlightPlayer[] = [
        { id: pA.id, nickname: pA.nickname, avatarUrl: pA.avatarUrl },
        { id: pB.id, nickname: pB.nickname, avatarUrl: pB.avatarUrl },
      ];

      const evidenceMatches = getEvidenceForStats(sharedMatches, 3);

      // A. BEST_DUO
      if (togetherTotal >= 5) {
        const priority = calculateHighlightScore(80, confidence, avgRating / 1.1, 0.8);
        highlights.push({
          id: `best-duo-${pA.id}-${pB.id}`,
          type: "DUO_SYNERGY",
          category: "competitive",
          priority,
          confidence: Math.round(confidence * 100),
          title: "Química Perfeita",
          subtitle: "Melhor parceria da temporada",
          text: `${pA.nickname} e ${pB.nickname} mostram grande entrosamento com ${Math.round(winrate * 100)}% de winrate em ${togetherTotal} partidas.`,
          players,
          metrics: [
            { label: "Jogos Juntos", value: togetherTotal },
            { label: "Winrate Geral", value: `${Math.round(winrate * 100)}%` },
            { label: "Rating Dupla", value: avgRating.toFixed(2) },
          ],
          period: "season",
          evidenceMatches,
        });
      }

      // B. HOT_DUO
      const recentSharedMatches = sharedMatches.slice(0, 10);
      const recentSharedTotal = recentSharedMatches.length;
      if (recentSharedTotal >= 3) {
        let recentWins = 0;
        let recentRatingSum = 0;
        for (const s of recentSharedMatches) {
          if (isWin(s)) recentWins++;
          const sB = statsBByMatch.get(s.matchId)!;
          recentRatingSum += (s.rating + sB.rating) / 2;
        }
        const recentWr = recentWins / recentSharedTotal;
        const recentConfidence = calculateConfidence(recentWr, recentSharedTotal);
        const recentAvgRating = recentRatingSum / recentSharedTotal;
        const priority = calculateHighlightScore(85, recentConfidence, recentAvgRating / 1.1, 1.0);

        highlights.push({
          id: `hot-duo-${pA.id}-${pB.id}`,
          type: "DUO_SYNERGY",
          category: "competitive",
          priority,
          confidence: Math.round(recentConfidence * 100),
          title: "Dupla Quente",
          subtitle: "Sinergia recente em alta",
          text: `${pA.nickname} e ${pB.nickname} estão impossíveis, vencendo ${recentWins} das últimas ${recentSharedTotal} partidas disputadas juntos.`,
          players,
          metrics: [
            { label: "Jogos Recentes", value: recentSharedTotal },
            { label: "Vitórias", value: recentWins },
            { label: "Rating Recente", value: recentAvgRating.toFixed(2) },
          ],
          period: "week",
          evidenceMatches,
        });
      }

      // C. VOLUME_DUO
      if (togetherTotal >= 8) {
        const priority = calculateHighlightScore(70, confidence, 1.15, 0.8);
        highlights.push({
          id: `volume-duo-${pA.id}-${pB.id}`,
          type: "DUO_SYNERGY",
          category: "competitive",
          priority,
          confidence: Math.round(confidence * 100),
          title: "Linha de Frente",
          subtitle: "Dupla mais assídua da temporada",
          text: `${pA.nickname} e ${pB.nickname} lideram a cooperação com ${togetherTotal} partidas jogadas no mesmo time.`,
          players,
          metrics: [
            { label: "Partidas Juntas", value: togetherTotal },
            { label: "Winrate", value: `${Math.round(winrate * 100)}%` },
          ],
          period: "season",
          evidenceMatches,
        });
      }
    }
  }

  // 2. Processar Jogadores: HOT_STREAK e BREAKOUT (categoria: competitive)
  for (const player of activePlayers) {
    const stats = statsByPlayer.get(player.id) ?? [];
    if (stats.length === 0) continue;

    const evidenceMatches = getEvidenceForStats(stats, 3);

    // A. HOT_STREAK
    const chronologicalStats = [...stats].reverse();
    let currentStreak = 0;
    for (let idx = chronologicalStats.length - 1; idx >= 0; idx--) {
      if (isWin(chronologicalStats[idx])) {
        currentStreak++;
      } else {
        break;
      }
    }

    if (currentStreak >= 3) {
      const priority = calculateHighlightScore(85, 1.0, 1.0 + (currentStreak - 3) * 0.1, 1.0);
      highlights.push({
        id: `hot-streak-${player.id}`,
        type: "HOT_STREAK",
        category: "competitive",
        priority,
        confidence: 100,
        title: "Em Ritmo Quente",
        subtitle: "Sequência invicta",
        text: `${player.nickname} está dominando o servidor com uma sequência ativa de ${currentStreak} vitórias seguidas.`,
        players: [{ id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl }],
        metrics: [
          { label: "Vitórias Seguidas", value: currentStreak },
        ],
        period: "week",
        evidenceMatches,
      });
    }

    // B. BREAKOUT (Antigo BIGGEST_EVOLUTION)
    const totalMatches = stats.length;
    if (totalMatches >= 5) {
      const seasonRating = stats.reduce((sum, s) => sum + s.rating, 0) / totalMatches;
      const recentStats = stats.slice(0, 10);
      const recentRating = recentStats.reduce((sum, s) => sum + s.rating, 0) / recentStats.length;
      const evolution = (recentRating - seasonRating) / seasonRating;

      if (evolution > 0.03) {
        const confidence = calculateConfidence(1.0, totalMatches);
        const priority = calculateHighlightScore(80, confidence, 1.0 + evolution, 1.0);

        highlights.push({
          id: `evolution-${player.id}`,
          type: "BREAKOUT",
          category: "competitive",
          priority,
          confidence: Math.round(confidence * 100),
          title: "Subindo Rápido",
          subtitle: "Maior evolução recente",
          text: `${player.nickname} decolou em desempenho, aumentando seu rating recente em +${Math.round(evolution * 100)}% em relação à sua média da temporada.`,
          players: [{ id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl }],
          metrics: [
            { label: "Rating Anterior", value: seasonRating.toFixed(2) },
            { label: "Rating Atual", value: recentRating.toFixed(2) },
            { label: "Evolução", value: `+${Math.round(evolution * 100)}%` },
          ],
          period: "week",
          evidenceMatches,
        });
      }
    }
  }

  // 3. Processar Mapas: MAP_MASTER (categoria: competitive)
  const mapSpecialists = getMapSpecialistsFromDataset(dataset);
  for (const spec of mapSpecialists) {
    const matchesCount = allStats.filter(
      (s) => s.playerId === spec.player.id && s.match.map.name === spec.mapName
    ).length;

    if (spec.rating >= 1.15 && matchesCount >= 3) {
      const confidence = calculateConfidence(spec.rating / 2.0, matchesCount);
      const priority = calculateHighlightScore(80, confidence, spec.rating / 1.1, 0.8);

      const playerStats = statsByPlayer.get(spec.player.id) ?? [];
      const mapStats = playerStats.filter((s) => s.match.map.name === spec.mapName);
      const evidenceMatches = getEvidenceForStats(mapStats, 3);

      highlights.push({
        id: `map-master-${spec.mapName}-${spec.player.id}`,
        type: "MAP_MASTER",
        category: "competitive",
        priority,
        confidence: Math.min(100, Math.round(confidence * 100)),
        title: `Rei da ${spec.mapName}`,
        subtitle: "Soberania no mapa",
        text: `${spec.player.nickname} domina completamente a ${spec.mapName} nesta temporada, registrando rating de ${spec.rating.toFixed(2)} em ${matchesCount} confrontos.`,
        players: [{ id: spec.player.id, nickname: spec.player.nickname, avatarUrl: spec.player.avatarUrl }],
        metrics: [
          { label: "Mapa", value: spec.mapName },
          { label: "Rating Mapa", value: spec.rating.toFixed(2) },
        ],
        period: "season",
        evidenceMatches,
      });
    }
  }

  // 4. Processar Marcas Históricas: RECORD (categoria: achievement)
  let maxKillsStat: any = null;
  for (const s of allStats) {
    if (!maxKillsStat || s.kills > maxKillsStat.kills) {
      maxKillsStat = s;
    }
  }

  if (maxKillsStat && maxKillsStat.kills >= 30) {
    const p = activePlayers.find((ap) => ap.id === maxKillsStat.playerId);
    if (p) {
      const scoreSelf = maxKillsStat.team === "A" ? maxKillsStat.match.scoreTeamA : maxKillsStat.match.scoreTeamB;
      const scoreOpp = maxKillsStat.team === "A" ? maxKillsStat.match.scoreTeamB : maxKillsStat.match.scoreTeamA;
      const recordEvidence: HighlightEvidenceMatch[] = [{
        mapName: maxKillsStat.match.map.name,
        scoreSelf,
        scoreOpp,
        won: scoreSelf > scoreOpp,
      }];

      const priority = calculateHighlightScore(90, 1.0, 1.25, 0.8);
      highlights.push({
        id: `record-kills-${p.id}`,
        type: "RECORD",
        category: "achievement",
        priority,
        confidence: 100,
        title: "Marca Histórica",
        subtitle: "Recorde de Kills",
        text: `${p.nickname} cravou seu nome na história do Hub ao registrar ${maxKillsStat.kills} eliminações em uma única partida no mapa ${maxKillsStat.match.map.name}.`,
        players: [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }],
        metrics: [
          { label: "Kills Recorde", value: maxKillsStat.kills },
          { label: "Mapa", value: maxKillsStat.match.map.name },
        ],
        period: "season",
        evidenceMatches: recordEvidence,
      });
    }
  }

  return highlights.sort((a, b) => b.priority - a.priority);
}
