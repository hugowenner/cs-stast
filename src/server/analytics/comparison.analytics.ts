import { calculateWinrate } from "./player.analytics";
import type { PlayerComparisonDTO } from "@/server/dtos/playerComparison.dto";

// Interface do provedor de insights
export interface ComparisonInsightProvider {
  getInsights(
    players: any[],
    h2h: any,
    outcomes: { [playerId: string]: any[] }
  ): PlayerComparisonDTO["insights"];
}

// Implementação baseada em regras determinísticas
export class RuleBasedInsightProvider implements ComparisonInsightProvider {
  getInsights(
    players: any[],
    h2h: any,
    outcomes: { [playerId: string]: any[] }
  ): PlayerComparisonDTO["insights"] {
    const insights: PlayerComparisonDTO["insights"] = [];
    if (players.length < 2) return insights;

    const pA = players[0];
    const pB = players[1];

    // 1. Confronto Direto (Against)
    const winsA = h2h.against.wins[pA.id] ?? 0;
    const winsB = h2h.against.wins[pB.id] ?? 0;
    const totalAgainst = h2h.against.total;

    if (totalAgainst > 0) {
      if (winsA > winsB) {
        insights.push({
          type: "positive",
          severity: "high",
          title: `Dominância no Confronto Direto`,
          description: `${pA.nickname} levou a melhor nas partidas contra ${pB.nickname}, vencendo ${winsA} de ${totalAgainst} confrontos (${Math.round((winsA / totalAgainst) * 100)}%).`,
        });
      } else if (winsB > winsA) {
        insights.push({
          type: "positive",
          severity: "high",
          title: `Dominância no Confronto Direto`,
          description: `${pB.nickname} levou a melhor nas partidas contra ${pA.nickname}, vencendo ${winsB} de ${totalAgainst} confrontos (${Math.round((winsB / totalAgainst) * 100)}%).`,
        });
      } else if (winsA === winsB && winsA > 0) {
        insights.push({
          type: "neutral",
          severity: "medium",
          title: `Equilíbrio Perfeito`,
          description: `O histórico de confrontos diretos entre ${pA.nickname} e ${pB.nickname} está totalmente empatado em ${winsA}x${winsB}.`,
        });
      }
    }

    // 2. Sinergia (Together)
    const togetherWinrate = h2h.together.winrate;
    const totalTogether = h2h.together.total;

    if (totalTogether >= 3) {
      const avgWinrate = (pA.metrics.winrate + pB.metrics.winrate) / 2;
      const synergyDiff = togetherWinrate - avgWinrate;

      if (synergyDiff > 5) {
        insights.push({
          type: "positive",
          severity: "medium",
          title: `Alta Sinergia de Equipe`,
          description: `Quando jogam juntos, o winrate deles sobe para ${togetherWinrate}%, superando a média individual em +${synergyDiff.toFixed(1)}%. Ótima dupla de lineup!`,
        });
      } else if (synergyDiff < -5) {
        insights.push({
          type: "negative",
          severity: "medium",
          title: `Alerta de Compatibilidade`,
          description: `Jogando juntos, o winrate cai para ${togetherWinrate}%, ficando ${Math.abs(synergyDiff).toFixed(1)}% abaixo da média individual combinada.`,
        });
      }
    }

    // 3. Comparação de Métricas de Combate
    const ratingDiff = pA.metrics.rating - pB.metrics.rating;
    const adrDiff = pA.metrics.adr - pB.metrics.adr;

    if (Math.abs(ratingDiff) >= 0.15) {
      const betterPlayer = ratingDiff > 0 ? pA : pB;
      const worsePlayer = ratingDiff > 0 ? pB : pA;
      insights.push({
        type: "neutral",
        severity: "medium",
        title: `Vantagem de Rating`,
        description: `${betterPlayer.nickname} possui uma vantagem estatística significativa de +${Math.abs(ratingDiff).toFixed(2)} de Rating sobre ${worsePlayer.nickname} no histórico da carreira.`,
      });
    }

    if (Math.abs(adrDiff) >= 10) {
      const betterPlayer = adrDiff > 0 ? pA : pB;
      const worsePlayer = adrDiff > 0 ? pB : pA;
      insights.push({
        type: "neutral",
        severity: "low",
        title: `Poder de Fogo`,
        description: `${betterPlayer.nickname} causa em média +${Math.abs(adrDiff).toFixed(1)} de dano por round a mais do que ${worsePlayer.nickname}.`,
      });
    }

    // 4. Especialidades em Mapas
    const mapsA = outcomes[pA.id] || [];
    const mapsB = outcomes[pB.id] || [];

    return insights;
  }
}

// Função para calcular compatibilidade (cálculo de sinergia entre jogadores)
export function calculateCompatibility(
  h2h: { together: { total: number; wins: number; winrate: number } },
  avgRatingA: number,
  avgRatingB: number
) {
  let score = 50; // Inicializa em neutro (50%)
  const total = h2h.together.total;
  const winrate = h2h.together.winrate;

  if (total === 0) {
    return { score: 50, label: "Sem Dados" };
  }

  // Peso 1: Winrate do grupo jogando juntos
  if (winrate >= 70) score += 25;
  else if (winrate >= 60) score += 15;
  else if (winrate >= 50) score += 5;
  else if (winrate >= 40) score -= 10;
  else score -= 20;

  // Peso 2: Nível estatístico dos jogadores (jogadores de alto nível somam sinergia natural)
  const combinedRating = (avgRatingA + avgRatingB) / 2;
  if (combinedRating >= 1.15) score += 10;
  else if (combinedRating >= 1.0) score += 5;
  else if (combinedRating < 0.9) score -= 5;

  // Peso 3: Confiabilidade da amostra (mais partidas juntas estabiliza o score)
  const reliabilityBonus = Math.min(total, 10) * 1.5;
  score += reliabilityBonus;

  // Limita o score entre 0 e 100
  const finalScore = Math.min(Math.max(Math.round(score), 10), 99);

  let label = "Média";
  if (finalScore >= 85) label = "Excelente Sinergia";
  else if (finalScore >= 70) label = "Boa Compatibilidade";
  else if (finalScore >= 45) label = "Compatibilidade Regular";
  else label = "Baixa Sinergia";

  return {
    score: finalScore,
    label,
  };
}

// Função para processar os confrontos (juntos vs contra)
export function processH2HMatches(
  playerAId: string,
  playerBId: string,
  outcomesA: any[],
  outcomesB: any[]
) {
  const matchesBMap = new Map(outcomesB.map((o) => [o.match.id, o]));

  let togetherTotal = 0;
  let togetherWins = 0;
  let togetherLosses = 0;

  let againstTotal = 0;
  let winsA = 0;
  let winsB = 0;
  let againstTies = 0;

  for (const rowA of outcomesA) {
    const rowB = matchesBMap.get(rowA.match.id);
    if (!rowB) continue; // Não jogaram na mesma partida

    const isTogether = rowA.team === rowB.team;

    const scoreSelf = rowA.team === "A" ? rowA.match.scoreTeamA : rowA.match.scoreTeamB;
    const scoreOpp = rowA.team === "A" ? rowA.match.scoreTeamB : rowA.match.scoreTeamA;
    const isAWin = scoreSelf > scoreOpp;
    const isALoss = scoreSelf < scoreOpp;

    if (isTogether) {
      togetherTotal++;
      if (isAWin) togetherWins++;
      else if (isALoss) togetherLosses++;
    } else {
      againstTotal++;
      if (isAWin) {
        winsA++; // A ganhou de B
      } else if (isALoss) {
        winsB++; // B ganhou de A
      } else {
        againstTies++;
      }
    }
  }

  return {
    together: {
      total: togetherTotal,
      wins: togetherWins,
      losses: togetherLosses,
      winrate: calculateWinrate(togetherWins, togetherTotal),
    },
    against: {
      total: againstTotal,
      wins: {
        [playerAId]: winsA,
        [playerBId]: winsB,
      },
      ties: againstTies,
    },
  };
}
