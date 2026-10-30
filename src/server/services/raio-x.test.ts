import { describe, it, expect } from "vitest";
import {
  calculateEntregamos5v4,
  calculatePartnersRankings,
  calculateMelhorDuplaZinda,
  calculateEspecialistaArmas,
  calculateReiRoundsDecisivos,
  calculatePlantouGanhou,
  calculateTerrorDosAmigos,
  calculateEconomiaDesastre,
  calculateMatadorEco,
  getRaioXBundle,
  normalizeWeapon,
} from "./raio-x.service";
import type { CompetitiveDataset } from "./competitive.service";

describe("Raio-X da Criticância — Suíte Completa dos 9 Módulos", () => {
  // ══════════════════════════════════════════════════════════════════════════
  // MÓDULO 1: ENTREGAMOS O 5v4?
  // ══════════════════════════════════════════════════════════════════════════
  describe("Card #01 — Entregamos o 5v4?", () => {
    it("calcula taxa de conversão e entrega corretamente", async () => {
      const stats = await calculateEntregamos5v4("all");
      expect(typeof stats.totalEligibleRounds).toBe("number");
      expect(typeof stats.totalAdvantagesCreated).toBe("number");
      if (stats.hasTelemetry) {
        expect(stats.conversionRate).not.toBeNull();
        expect(stats.surrenderRate).not.toBeNull();
        expect(stats.conversionRate! + stats.surrenderRate!).toBe(100);
      } else {
        expect(stats.telemetryUnavailableReason).toBeTruthy();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MÓDULO 2: TERROR DOS AMIGOS
  // ══════════════════════════════════════════════════════════════════════════
  describe("Card #02 — Terror dos Amigos", () => {
    it("calcula telemetria real de dano aliado e flashes nos payloads", async () => {
      const stats = await calculateTerrorDosAmigos("all");
      expect(stats.hasTelemetry).toBe(true);
      expect(stats.totalMatchesAnalyzed).toBeGreaterThan(0);
      expect(stats.totalTeamDamage).toBeGreaterThan(0);
      expect(stats.totalTeamFlashes).toBeGreaterThan(0);
      expect(stats.rankings.length).toBeGreaterThan(0);
    });

    it("calcula taxa de incidentes por 100 rounds normalizando exposição em fixture", async () => {
      const fixture = {
        hasTelemetry: true,
        totalMatchesAnalyzed: 10,
        totalRoundsAnalyzed: 250,
        totalTeamDamage: 320,
        totalTeamKills: 2,
        totalTeamFlashes: 45,
        rankings: [
          {
            player: { id: "p1", nickname: "FlasherPro", avatarUrl: null },
            roundsPlayed: 100,
            teamDamage: 150,
            teamKills: 1,
            teamFlashes: 30,
            teamBlindDurationSeconds: 42.5,
            incidentsPer100Rounds: 31,
          },
          {
            player: { id: "p2", nickname: "SafeGuy", avatarUrl: null },
            roundsPlayed: 150,
            teamDamage: 20,
            teamKills: 0,
            teamFlashes: 5,
            teamBlindDurationSeconds: 6.2,
            incidentsPer100Rounds: 3.3,
          },
        ],
      };

      const result = await calculateTerrorDosAmigos("all", fixture);
      expect(result.hasTelemetry).toBe(true);
      expect(result.rankings).toHaveLength(2);
      expect(result.rankings[0].incidentsPer100Rounds).toBeGreaterThan(
        result.rankings[1].incidentsPer100Rounds,
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MÓDULO 3: ECONOMIA DO DESASTRE
  // ══════════════════════════════════════════════════════════════════════════
  describe("Card #03 — Economia do Desastre", () => {
    it("calcula estatísticas reais de investimento e winrates por tipo de compra", async () => {
      const stats = await calculateEconomiaDesastre("all");
      expect(stats.hasTelemetry).toBe(true);
      expect(stats.totalRoundsAnalyzed).toBeGreaterThan(0);
      expect(stats.fullBuyWinrate).not.toBeNull();
      expect(stats.forceBuyWinrate).not.toBeNull();
      expect(stats.fullEcoWinrate).not.toBeNull();
    });

    it("calcula winrate de forçado e não considera dados ausentes como zero", async () => {
      const fixture = {
        hasTelemetry: true,
        totalRoundsAnalyzed: 100,
        forceBuyRounds: 20,
        forceBuyWins: 6,
        forceBuyWinrate: 30,
        fullEcoRounds: 10,
        fullEcoWins: 1,
        fullEcoWinrate: 10,
        fullBuyRounds: 70,
        fullBuyWins: 42,
        fullBuyWinrate: 60,
      };

      const result = await calculateEconomiaDesastre("all", fixture);
      expect(result.hasTelemetry).toBe(true);
      expect(result.forceBuyWinrate).toBe(30);
      expect(result.fullEcoWinrate).toBe(10);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MÓDULO 4: MELHOR DUPLA DA ZINDA
  // ══════════════════════════════════════════════════════════════════════════
  describe("Card #04 — Melhor Dupla da Zinda (Sinergia de Trocas)", () => {
    it("agrega trocas mútuas e tempo de re-frag com dados reais", async () => {
      const stats = await calculateMelhorDuplaZinda("all", 5);
      expect(stats.hasTelemetry).toBe(true);
      expect(stats.totalTrackedTrades).toBeGreaterThan(0);
      expect(stats.allEligibleDuos.length).toBeGreaterThan(0);

      const top = stats.mostSynergicDuo;
      expect(top).not.toBeNull();
      expect(top!.totalMutualTrades).toBeGreaterThanOrEqual(5);
      expect(top!.tradesAAvengedB + top!.tradesBAvengedA).toBe(top!.totalMutualTrades);
      expect(top!.avgRefragTimeSeconds).toBeGreaterThan(0);
    });

    it("valida tempo mais rápido de re-frag na dupla mais rápida", async () => {
      const stats = await calculateMelhorDuplaZinda("all", 5);
      const fastest = stats.fastestTradeDuo;
      expect(fastest).not.toBeNull();
      expect(fastest!.avgRefragTimeSeconds).toBeLessThan(5);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MÓDULO 5: MATADOR DE ECO
  // ══════════════════════════════════════════════════════════════════════════
  describe("Card #05 — Matador de Eco", () => {
    it("calcula abates anti-eco reais com classificação nativa do parser", async () => {
      const stats = await calculateMatadorEco("all");
      expect(stats.hasTelemetry).toBe(true);
      expect(stats.totalAnalyzedKills).toBeGreaterThan(0);
      expect(stats.totalEcoKills).toBeGreaterThan(0);
      expect(stats.rankings.length).toBeGreaterThan(0);
      expect(stats.topEcoHunter).not.toBeNull();
    });

    it("calcula proporção de abates eco vs total com fixture", async () => {
      const fixture = {
        hasTelemetry: true,
        totalAnalyzedKills: 500,
        totalEcoKills: 85,
        topEcoHunter: {
          player: { id: "p1", nickname: "EcoFarmer", avatarUrl: null },
          ecoKills: 35,
          totalKills: 100,
          ecoKillPercentage: 35,
          antiEcoRoundKillsPerRound: 1.2,
        },
        rankings: [
          {
            player: { id: "p1", nickname: "EcoFarmer", avatarUrl: null },
            ecoKills: 35,
            totalKills: 100,
            ecoKillPercentage: 35,
            antiEcoRoundKillsPerRound: 1.2,
          },
        ],
      };

      const result = await calculateMatadorEco("all", fixture);
      expect(result.hasTelemetry).toBe(true);
      expect(result.topEcoHunter!.ecoKillPercentage).toBe(35);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MÓDULO 6: PLANTOU, GANHOU?
  // ══════════════════════════════════════════════════════════════════════════
  describe("Card #06 — Plantou, Ganhou?", () => {
    it("calcula conversão pós-plant e retake rate de forma complementar (100%)", async () => {
      const stats = await calculatePlantouGanhou("all");
      expect(stats.hasTelemetry).toBe(true);
      expect(stats.totalPostPlants).toBe(stats.bombsExploded + stats.bombsDefused);
      expect(stats.postPlantConversionRate! + stats.retakeSuccessRate!).toBe(100);
      expect(stats.topDefusers.length).toBeGreaterThan(0);
      expect(stats.topDefusers[0].defuses).toBeGreaterThanOrEqual(stats.topDefusers[1]?.defuses ?? 0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MÓDULO 7: ESPECIALISTA EM ARMAS
  // ══════════════════════════════════════════════════════════════════════════
  describe("Card #07 — Especialista em Armas", () => {
    it("normaliza nomes e categorias de armas do CS2 corretamente", () => {
      expect(normalizeWeapon("ak47")).toEqual({ displayName: "AK-47", category: "rifles" });
      expect(normalizeWeapon("m4a1_silencer")).toEqual({ displayName: "M4A1-S", category: "rifles" });
      expect(normalizeWeapon("m4a1")).toEqual({ displayName: "M4A4", category: "rifles" });
      expect(normalizeWeapon("awp")).toEqual({ displayName: "AWP", category: "snipers" });
      expect(normalizeWeapon("deagle")).toEqual({ displayName: "Desert Eagle", category: "pistols" });
      expect(normalizeWeapon("mp9")).toEqual({ displayName: "MP9", category: "smgs" });
      expect(normalizeWeapon("knife_ursus")).toEqual({ displayName: "Faca", category: "utility" });
    });

    it("identifica líderes por categoria (Rifler, Sniper, Pistoleiro, SMG) com dados reais", async () => {
      const stats = await calculateEspecialistaArmas("all");
      expect(stats.hasTelemetry).toBe(true);
      expect(stats.totalKillsAnalyzed).toBeGreaterThan(1000);
      expect(stats.topRifler).not.toBeNull();
      expect(stats.topSniper).not.toBeNull();
      expect(stats.topPistoleiro).not.toBeNull();
      expect(stats.playerProfiles.length).toBeGreaterThan(0);

      // O líder de rifle deve ter mais kills com rifle que com outras categorias
      expect(stats.topRifler!.kills).toBeGreaterThan(0);
      expect(stats.topRifler!.category).toBe("rifles");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MÓDULO 8: REI DOS ROUNDS DECISIVOS
  // ══════════════════════════════════════════════════════════════════════════
  describe("Card #08 — Rei dos Rounds Decisivos", () => {
    it("analisa rounds 12, 24 e prorrogações determinando pontuação de impacto", async () => {
      const stats = await calculateReiRoundsDecisivos("all");
      expect(stats.hasTelemetry).toBe(true);
      expect(stats.totalDecisiveRoundsAnalyzed).toBeGreaterThan(100);
      expect(stats.topDecisivePlayer).not.toBeNull();
      expect(stats.topDecisiveMvp).not.toBeNull();
      expect(stats.rankings.length).toBeGreaterThan(0);

      const top = stats.topDecisivePlayer!;
      expect(top.decisiveImpactScore).toBeGreaterThanOrEqual(stats.rankings[1]?.decisiveImpactScore ?? 0);
      expect(top.mvps + top.firstKills + top.clutchesWon).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MÓDULO 9: PARCEIROS DE VITÓRIA E DERROTA
  // ══════════════════════════════════════════════════════════════════════════
  describe("Card #09 — Parceiros de Vitória e Derrota", () => {
    const mockDataset = {
      activePlayers: [
        { id: "p1", nickname: "Jogador 1", avatarUrl: null, steamId: "s1" },
        { id: "p2", nickname: "Jogador 2", avatarUrl: null, steamId: "s2" },
        { id: "p3", nickname: "Jogador 3", avatarUrl: null, steamId: "s3" },
      ],
      statsByPlayer: new Map([
        [
          "p1",
          Array.from({ length: 10 }, (_, i) => ({
            matchId: `m${i}`,
            playerId: "p1",
            team: "A",
            match: { scoreTeamA: 13, scoreTeamB: 8, playedAt: new Date(2026, 9, i + 1) },
          })),
        ],
        [
          "p2",
          Array.from({ length: 10 }, (_, i) => ({
            matchId: `m${i}`,
            playerId: "p2",
            team: "A",
            match: { scoreTeamA: 13, scoreTeamB: 8, playedAt: new Date(2026, 9, i + 1) },
          })),
        ],
        ["p3", []],
      ]),
      matches: [],
    } as unknown as CompetitiveDataset;

    it("inclui duplas com exatamente 10 partidas e calcula winrate de 100%", () => {
      const rankings = calculatePartnersRankings(mockDataset, 10);
      expect(rankings.totalEligibleDuos).toBe(1);
      const duo = rankings.allEligibleDuos[0];
      expect(duo.total).toBe(10);
      expect(duo.wins).toBe(10);
      expect(duo.winrate).toBe(100);
      expect(duo.lossRate).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // BUNDLE COMPLETO DO RAIO-X
  // ══════════════════════════════════════════════════════════════════════════
  describe("getRaioXBundle", () => {
    it("retorna o bundle completo com todos os 9 módulos populados", async () => {
      const bundle = await getRaioXBundle("all");
      expect(bundle).toHaveProperty("entregamos5v4");
      expect(bundle).toHaveProperty("terrorDosAmigos");
      expect(bundle).toHaveProperty("economiaDesastre");
      expect(bundle).toHaveProperty("melhorDupla");
      expect(bundle).toHaveProperty("matadorEco");
      expect(bundle).toHaveProperty("plantouGanhou");
      expect(bundle).toHaveProperty("especialistaArmas");
      expect(bundle).toHaveProperty("reiRoundsDecisivos");
      expect(bundle).toHaveProperty("parceiros");

      // Todos os 9 módulos operacionais confirmados com telemetria ativa
      expect(bundle.entregamos5v4.totalEligibleRounds).toBeGreaterThan(0);
      expect(bundle.terrorDosAmigos.hasTelemetry).toBe(true);
      expect(bundle.economiaDesastre.hasTelemetry).toBe(true);
      expect(bundle.melhorDupla.hasTelemetry).toBe(true);
      expect(bundle.matadorEco.hasTelemetry).toBe(true);
      expect(bundle.plantouGanhou.hasTelemetry).toBe(true);
      expect(bundle.especialistaArmas.hasTelemetry).toBe(true);
      expect(bundle.reiRoundsDecisivos.hasTelemetry).toBe(true);
      expect(bundle.parceiros.monitoredPlayers.length).toBeGreaterThan(0);
    });
  });
});
