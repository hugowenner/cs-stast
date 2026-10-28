import { describe, expect, it } from "vitest";
// Importamos a função de interesse
import {
  getMapSpecialistsFromDataset,
  getPlayerArchetypesFromDataset,
  getAdvancedPerformanceStatsFromDataset,
  getMultikillsLeaderboards,
  getPerformanceExtremesFromDataset,
  getWorstRecordsFromDataset,
} from "./competitive.service";

describe("getMapSpecialistsFromDataset", () => {
  it("eleger o jogador com melhor rating entre os elegíveis (dois jogadores diferentes no mesmo mapa)", () => {
    const dataset = {
      activePlayers: [
        { id: "playerA", nickname: "Jogador A", avatarUrl: null, levelGc: 14 },
        { id: "playerB", nickname: "Jogador B", avatarUrl: null, levelGc: 12 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // Jogador A jogou 3 partidas com média 1.10 (3 vitórias)
        { playerId: "playerA", rating: 1.10, team: "A", match: { map: { id: "m_dust2", name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerA", rating: 1.10, team: "A", match: { map: { id: "m_dust2", name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerA", rating: 1.10, team: "A", match: { map: { id: "m_dust2", name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
        
        // Jogador B jogou 4 partidas com média 1.30 (4 vitórias)
        { playerId: "playerB", rating: 1.30, team: "A", match: { map: { id: "m_dust2", name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerB", rating: 1.30, team: "A", match: { map: { id: "m_dust2", name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerB", rating: 1.30, team: "A", match: { map: { id: "m_dust2", name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerB", rating: 1.30, team: "A", match: { map: { id: "m_dust2", name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
      ],
    };

    dataset.statsByPlayer.set("playerA", dataset.allStats.filter(s => s.playerId === "playerA"));
    dataset.statsByPlayer.set("playerB", dataset.allStats.filter(s => s.playerId === "playerB"));

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);

    expect(specialists).toHaveLength(1);
    expect(specialists[0]).toMatchObject({
      mapId: "m_dust2",
      mapName: "Dust2",
      player: { id: "playerB", nickname: "Jogador B", levelGc: 12 },
      rating: 1.30,
    });
  });

  it("ignorar jogador com alto rating se não atingir o limite mínimo dinâmico de volume", () => {
    const dataset = {
      activePlayers: [
        { id: "playerA", nickname: "Jogador A", avatarUrl: null, levelGc: 14 },
        { id: "playerB", nickname: "Jogador B", avatarUrl: null, levelGc: 12 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // Jogador A jogou 5 partidas com média 1.20 e vitórias
        { playerId: "playerA", rating: 1.20, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerA", rating: 1.20, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerA", rating: 1.20, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerA", rating: 1.20, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerA", rating: 1.20, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 13, scoreTeamB: 5 } },
        
        // Jogador B jogou apenas 1 partida com rating 2.0 (Dominante, mas volume insuficiente)
        { playerId: "playerB", rating: 2.00, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 13, scoreTeamB: 5 } },
      ],
    };

    dataset.statsByPlayer.set("playerA", dataset.allStats.filter(s => s.playerId === "playerA"));
    dataset.statsByPlayer.set("playerB", dataset.allStats.filter(s => s.playerId === "playerB"));

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);

    expect(specialists).toHaveLength(1);
    // Deve eleger Jogador A, pois minGames calculado será 3 (Math.max(3, Math.round(5 * 0.3)))
    // Jogador B com apenas 1 partida fica inelegível
    expect(specialists[0]).toMatchObject({
      mapName: "Mirage",
      player: { id: "playerA", nickname: "Jogador A", levelGc: 14 },
      rating: 1.20,
    });
  });

  it("mapear corretamente múltiplos mapas com especialistas distintos", () => {
    const dataset = {
      activePlayers: [
        { id: "playerA", nickname: "Jogador A", avatarUrl: null, levelGc: 15 },
        { id: "playerB", nickname: "Jogador B", avatarUrl: null, levelGc: 13 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // Mapa Nuke: Jogador A é o único elegível (3 partidas com vitória)
        { playerId: "playerA", rating: 1.40, team: "A", match: { map: { name: "Nuke" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerA", rating: 1.40, team: "A", match: { map: { name: "Nuke" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerA", rating: 1.40, team: "A", match: { map: { name: "Nuke" }, scoreTeamA: 13, scoreTeamB: 5 } },

        // Mapa Inferno: Jogador B é o único elegível (3 partidas com vitória)
        { playerId: "playerB", rating: 1.50, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerB", rating: 1.50, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "playerB", rating: 1.50, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 13, scoreTeamB: 5 } },
      ],
    };

    dataset.statsByPlayer.set("playerA", dataset.allStats.filter(s => s.playerId === "playerA"));
    dataset.statsByPlayer.set("playerB", dataset.allStats.filter(s => s.playerId === "playerB"));

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);

    expect(specialists).toHaveLength(2);
    
    const nukeSpec = specialists.find(s => s.mapName === "Nuke");
    expect(nukeSpec).toBeDefined();
    expect(nukeSpec?.player?.id).toBe("playerA");
    expect(nukeSpec?.rating).toBe(1.40);

    const infernoSpec = specialists.find(s => s.mapName === "Inferno");
    expect(infernoSpec).toBeDefined();
    expect(infernoSpec?.player?.id).toBe("playerB");
    expect(infernoSpec?.rating).toBe(1.50);
  });

  it("retornar player: null, rating: null e podium vazio para mapa sem jogador elegível (0 elegíveis)", () => {
    const dataset = {
      activePlayers: [
        { id: "playerA", nickname: "Jogador A", avatarUrl: null, levelGc: 15 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // Jogador A jogou 3 partidas mas perdeu todas (scoreTeamA 5 < scoreTeamB 13)
        { playerId: "playerA", rating: 1.20, team: "A", match: { map: { name: "Anubis" }, scoreTeamA: 5, scoreTeamB: 13 } },
        { playerId: "playerA", rating: 1.20, team: "A", match: { map: { name: "Anubis" }, scoreTeamA: 5, scoreTeamB: 13 } },
        { playerId: "playerA", rating: 1.20, team: "A", match: { map: { name: "Anubis" }, scoreTeamA: 5, scoreTeamB: 13 } },
      ],
    };

    dataset.statsByPlayer.set("playerA", dataset.allStats);

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);

    expect(specialists).toHaveLength(1);
    expect(specialists[0]).toMatchObject({
      mapName: "Anubis",
      player: null,
      rating: null,
      wins: 0,
      matches: 0,
      winrate: 0,
      podium: [],
    });
  });

  it("retornar pódio com exatamente 1 jogador quando apenas 1 for elegível", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "Player 2", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // p1: 3 partidas, 2 vitórias (ELEGÍVEL)
        { playerId: "p1", rating: 1.10, team: "A", match: { map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "p1", rating: 1.20, team: "A", match: { map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "p1", rating: 1.00, team: "A", match: { map: { name: "Dust2" }, scoreTeamA: 5, scoreTeamB: 13 } },

        // p2: apenas 2 partidas (INELEGÍVEL por partidas < 3)
        { playerId: "p2", rating: 1.90, team: "A", match: { map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "p2", rating: 1.90, team: "A", match: { map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 5 } },
      ],
    };

    dataset.statsByPlayer.set("p1", dataset.allStats.filter(s => s.playerId === "p1"));
    dataset.statsByPlayer.set("p2", dataset.allStats.filter(s => s.playerId === "p2"));

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    expect(specialists).toHaveLength(1);
    expect(specialists[0].player?.id).toBe("p1");
    expect(specialists[0].podium).toHaveLength(1);
    expect(specialists[0].podium[0].player.id).toBe("p1");
    expect(specialists[0].podium[0].wins).toBe(2);
    expect(specialists[0].podium[0].matches).toBe(3);
  });

  it("retornar pódio com 2 jogadores quando apenas 2 forem elegíveis", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "Player 2", avatarUrl: null, levelGc: 10 },
        { id: "p3", nickname: "Player 3", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // p1: 4 partidas, 3 vitórias
        { playerId: "p1", rating: 1.20, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "p1", rating: 1.20, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "p1", rating: 1.20, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "p1", rating: 1.00, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 5, scoreTeamB: 13 } },

        // p2: 3 partidas, 2 vitórias
        { playerId: "p2", rating: 1.15, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "p2", rating: 1.15, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 13, scoreTeamB: 5 } },
        { playerId: "p2", rating: 1.00, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 5, scoreTeamB: 13 } },

        // p3: 3 partidas, 0 vitórias (INELEGÍVEL)
        { playerId: "p3", rating: 1.50, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 5, scoreTeamB: 13 } },
        { playerId: "p3", rating: 1.50, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 5, scoreTeamB: 13 } },
        { playerId: "p3", rating: 1.50, team: "A", match: { map: { name: "Mirage" }, scoreTeamA: 5, scoreTeamB: 13 } },
      ],
    };

    dataset.statsByPlayer.set("p1", dataset.allStats.filter(s => s.playerId === "p1"));
    dataset.statsByPlayer.set("p2", dataset.allStats.filter(s => s.playerId === "p2"));
    dataset.statsByPlayer.set("p3", dataset.allStats.filter(s => s.playerId === "p3"));

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    expect(specialists).toHaveLength(1);
    expect(specialists[0].player?.id).toBe("p1");
    expect(specialists[0].podium).toHaveLength(2);
    expect(specialists[0].podium[0].player.id).toBe("p1");
    expect(specialists[0].podium[1].player.id).toBe("p2");
  });

  it("retornar no máximo 3 jogadores no pódio e ordenar por todos os critérios de desempate", () => {
    // 5 jogadores elegíveis para testar desempates:
    // p1: 4 vitórias em 5 partidas (80% WR, rating 1.20) -> 1º lugar por vitórias
    // p2: 3 vitórias em 3 partidas (100% WR, rating 1.10) -> 2º lugar (3V, maior WR que p3)
    // p3: 3 vitórias em 4 partidas (75% WR, rating 1.30) -> 3º lugar (3V, 75% WR, maior rating que p4)
    // p4: 3 vitórias em 4 partidas (75% WR, rating 1.10) -> 4º lugar (fica fora do pódio)
    // p5: 3 vitórias em 4 partidas (75% WR, rating 1.10) -> 5º lugar (desempate por ID alfabético com p4)
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "P1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "P2", avatarUrl: null, levelGc: 10 },
        { id: "p3", nickname: "P3", avatarUrl: null, levelGc: 10 },
        { id: "p4_b", nickname: "P4_B", avatarUrl: null, levelGc: 10 },
        { id: "p4_a", nickname: "P4_A", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // p1: 4V em 5P
        ...Array(4).fill(0).map(() => ({ playerId: "p1", rating: 1.20, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 13, scoreTeamB: 5 } })),
        { playerId: "p1", rating: 1.20, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 5, scoreTeamB: 13 } },

        // p2: 3V em 3P (100% WR)
        ...Array(3).fill(0).map(() => ({ playerId: "p2", rating: 1.10, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 13, scoreTeamB: 5 } })),

        // p3: 3V em 4P (75% WR, rating 1.30)
        ...Array(3).fill(0).map(() => ({ playerId: "p3", rating: 1.30, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 13, scoreTeamB: 5 } })),
        { playerId: "p3", rating: 1.30, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 5, scoreTeamB: 13 } },

        // p4_a: 3V em 4P (75% WR, rating 1.10, ID p4_a < p4_b)
        ...Array(3).fill(0).map(() => ({ playerId: "p4_a", rating: 1.10, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 13, scoreTeamB: 5 } })),
        { playerId: "p4_a", rating: 1.10, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 5, scoreTeamB: 13 } },

        // p4_b: 3V em 4P (75% WR, rating 1.10, ID p4_b)
        ...Array(3).fill(0).map(() => ({ playerId: "p4_b", rating: 1.10, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 13, scoreTeamB: 5 } })),
        { playerId: "p4_b", rating: 1.10, team: "A", match: { map: { name: "Inferno" }, scoreTeamA: 5, scoreTeamB: 13 } },
      ],
    };

    dataset.activePlayers.forEach(p => {
      dataset.statsByPlayer.set(p.id, dataset.allStats.filter(s => s.playerId === p.id));
    });

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    expect(specialists).toHaveLength(1);
    
    // O líder do mapa deve ser exatamente o 1º colocado do pódio
    expect(specialists[0].player?.id).toBe("p1");
    expect(specialists[0].wins).toBe(4);

    // O pódio deve retornar exatamente 3 jogadores distintos (p1, p2, p3)
    expect(specialists[0].podium).toHaveLength(3);
    expect(specialists[0].podium[0].player.id).toBe("p1");
    expect(specialists[0].podium[1].player.id).toBe("p2");
    expect(specialists[0].podium[2].player.id).toBe("p3");

    // Jogadores fora do top 3 não devem entrar
    const podiumIds = specialists[0].podium.map(e => e.player.id);
    expect(podiumIds).not.toContain("p4_a");
    expect(podiumIds).not.toContain("p4_b");
  });

  it("desempatar corretamente pelo ID estável crescente quando vitórias, WR e rating forem idênticos", () => {
    const dataset = {
      activePlayers: [
        { id: "player_zeta", nickname: "Zeta", avatarUrl: null, levelGc: 10 },
        { id: "player_alpha", nickname: "Alpha", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // Ambos jogam 3 partidas, ganham 3, com rating 1.20
        ...Array(3).fill(0).map(() => ({ playerId: "player_zeta", rating: 1.20, team: "A", match: { map: { name: "Overpass" }, scoreTeamA: 13, scoreTeamB: 5 } })),
        ...Array(3).fill(0).map(() => ({ playerId: "player_alpha", rating: 1.20, team: "A", match: { map: { name: "Overpass" }, scoreTeamA: 13, scoreTeamB: 5 } })),
      ],
    };

    dataset.activePlayers.forEach(p => {
      dataset.statsByPlayer.set(p.id, dataset.allStats.filter(s => s.playerId === p.id));
    });

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);
    expect(specialists).toHaveLength(1);
    // player_alpha vem antes de player_zeta por ordenação alfabética de ID (critério 4)
    expect(specialists[0].player?.id).toBe("player_alpha");
    expect(specialists[0].podium[0].player.id).toBe("player_alpha");
    expect(specialists[0].podium[1].player.id).toBe("player_zeta");
  });
});

describe("getPlayerArchetypesFromDataset (Percentile-based)", () => {
  it("deve distribuir os arquétipos corretamente com base no percentil relativo", () => {
    const dataset = {
      activePlayers: [
        { id: "p_entry", nickname: "EntryGod", avatarUrl: null, levelGc: 20 },
        { id: "p_hs", nickname: "OneTap", avatarUrl: null, levelGc: 20 },
        { id: "p_clutch", nickname: "ClutchKing", avatarUrl: null, levelGc: 20 },
        { id: "p_support", nickname: "UtilityKing", avatarUrl: null, levelGc: 20 },
        { id: "p_impact", nickname: "ImpactGod", avatarUrl: null, levelGc: 20 },
        { id: "p_consistent", nickname: "ConsistentMr", avatarUrl: null, levelGc: 20 },
      ],
      statsByPlayer: new Map(),
      allStats: [] as any[],
    };

    const statsEntry = [
      { playerId: "p_entry", kills: 15, headshots: 5, entryKills: 3, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.05, adr: 80.0, kast: 70 },
      { playerId: "p_entry", kills: 15, headshots: 5, entryKills: 3, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.05, adr: 80.0, kast: 70 },
      { playerId: "p_entry", kills: 15, headshots: 5, entryKills: 3, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 0.90, adr: 80.0, kast: 70 },
    ];

    const statsHs = [
      { playerId: "p_hs", kills: 15, headshots: 12, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_hs", kills: 15, headshots: 12, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_hs", kills: 15, headshots: 12, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 0.90, adr: 75.0, kast: 70 },
    ];

    const statsClutch = [
      { playerId: "p_clutch", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 2, assists: 1, flashAssists: 0, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_clutch", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 2, assists: 1, flashAssists: 0, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_clutch", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 2, assists: 1, flashAssists: 0, rating: 0.90, adr: 75.0, kast: 70 },
    ];

    const statsSupport = [
      { playerId: "p_support", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 3, flashAssists: 3, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_support", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 3, flashAssists: 3, rating: 1.00, adr: 75.0, kast: 70 },
      { playerId: "p_support", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 3, flashAssists: 3, rating: 0.90, adr: 75.0, kast: 70 },
    ];

    const statsImpact = [
      { playerId: "p_impact", kills: 25, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.50, adr: 120.0, kast: 70 },
      { playerId: "p_impact", kills: 25, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.50, adr: 120.0, kast: 70 },
      { playerId: "p_impact", kills: 25, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 0.90, adr: 120.0, kast: 70 },
    ];

    const statsConsistent = [
      { playerId: "p_consistent", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.07, adr: 75.0, kast: 95 },
      { playerId: "p_consistent", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.07, adr: 75.0, kast: 95 },
      { playerId: "p_consistent", kills: 15, headshots: 5, entryKills: 0, clutchesWon: 0, assists: 1, flashAssists: 0, rating: 1.07, adr: 75.0, kast: 95 },
    ];

    const allStats = [
      ...statsEntry,
      ...statsHs,
      ...statsClutch,
      ...statsSupport,
      ...statsImpact,
      ...statsConsistent,
    ];

    dataset.allStats = allStats;
    dataset.statsByPlayer.set("p_entry", statsEntry);
    dataset.statsByPlayer.set("p_hs", statsHs);
    dataset.statsByPlayer.set("p_clutch", statsClutch);
    dataset.statsByPlayer.set("p_support", statsSupport);
    dataset.statsByPlayer.set("p_impact", statsImpact);
    dataset.statsByPlayer.set("p_consistent", statsConsistent);

    // @ts-ignore
    const result = getPlayerArchetypesFromDataset(dataset);

    const entryPlayer = result.find((r: any) => r.player.id === "p_entry");
    const hsPlayer = result.find((r: any) => r.player.id === "p_hs");
    const clutchPlayer = result.find((r: any) => r.player.id === "p_clutch");
    const supportPlayer = result.find((r: any) => r.player.id === "p_support");
    const impactPlayer = result.find((r: any) => r.player.id === "p_impact");
    const consistentPlayer = result.find((r: any) => r.player.id === "p_consistent");

    expect(entryPlayer?.archetype).toBe("entry");
    expect(hsPlayer?.archetype).toBe("headshot");
    expect(clutchPlayer?.archetype).toBe("clutch");
    expect(supportPlayer?.archetype).toBe("support");
    expect(impactPlayer?.archetype).toBe("impact");
    expect(consistentPlayer?.archetype).toBe("consistent");
  });
});

describe("getAdvancedPerformanceStatsFromDataset", () => {
  it("ignora valores nulos nas médias de damage e gcRating e calcula as médias corretamente (Caso 1 e 2)", () => {
    const dataset = {
      activePlayers: [{ id: "playerA", nickname: "Jogador A", avatarUrl: null, levelGc: 14 }],
      statsByPlayer: new Map(),
      allStats: [
        { playerId: "playerA", matchId: "m1", damage: 1000, gcRating: 1.10, doubleKills: 2 },
        { playerId: "playerA", matchId: "m2", damage: null, gcRating: null, doubleKills: null },
        { playerId: "playerA", matchId: "m3", damage: 2000, gcRating: 1.30, doubleKills: 3 },
      ],
    };
    
    // @ts-ignore
    const stats = getAdvancedPerformanceStatsFromDataset(dataset);

    expect(stats.sampleSize).toBe(2); // Apenas m1 e m3 possuem dados GC avançados
    expect(stats.averageDamage).toBe(1500); // (1000 + 2000) / 2
    expect(stats.averageGcRating).toBe(1.20); // (1.10 + 1.30) / 2
    expect(stats.totalDoubleKills).toBe(5); // 2 + 3
  });

  it("retorna nulos se todas as estatísticas forem nulas (Caso 3 - banco histórico)", () => {
    const dataset = {
      activePlayers: [{ id: "playerA", nickname: "Jogador A", avatarUrl: null, levelGc: 14 }],
      statsByPlayer: new Map(),
      allStats: [
        { playerId: "playerA", matchId: "m1", damage: null, gcRating: null, doubleKills: null },
        { playerId: "playerA", matchId: "m2", damage: null, gcRating: null, doubleKills: null },
      ],
    };

    // @ts-ignore
    const stats = getAdvancedPerformanceStatsFromDataset(dataset);

    expect(stats.sampleSize).toBe(0);
    expect(stats.averageDamage).toBeNull();
    expect(stats.averageGcRating).toBeNull();
    expect(stats.totalDoubleKills).toBeNull();
    expect(stats.totalTripleKills).toBeNull();
    expect(stats.totalQuadKills).toBeNull();
    expect(stats.totalAces).toBeNull();
  });
});

describe("getMultikillsLeaderboards", () => {
  it("calcula somatórios e rankeia top 6 de forma decrescente, ignorando zeros", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: 10 },
        { id: "p2", nickname: "Player 2", avatarUrl: null, levelGc: 10 },
        { id: "p3", nickname: "Player 3", avatarUrl: null, levelGc: 10 },
        { id: "p4", nickname: "Player 4", avatarUrl: null, levelGc: 10 },
        { id: "p5", nickname: "Player 5", avatarUrl: null, levelGc: 10 },
        { id: "p6", nickname: "Player 6", avatarUrl: null, levelGc: 10 },
        { id: "p7", nickname: "Player 7", avatarUrl: null, levelGc: 10 },
        { id: "p8", nickname: "Player 8", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        { playerId: "p1", doubleKills: 10 },
        { playerId: "p2", doubleKills: 20 },
        { playerId: "p3", doubleKills: 30 },
        { playerId: "p4", doubleKills: 40 },
        { playerId: "p5", doubleKills: 50 },
        { playerId: "p6", doubleKills: 60 },
        { playerId: "p7", doubleKills: 70 }, // Mais alto
        { playerId: "p8", doubleKills: 0 },  // Inelegível (zero)
      ],
    };

    // @ts-ignore
    const result = getMultikillsLeaderboards(dataset);

    // Double Kills deve ter tamanho 6 (dos 7 elegíveis), ordenado desc. p8 (zero) deve ser ignorado.
    expect(result.doubleKills).toHaveLength(6);
    expect(result.doubleKills[0]).toMatchObject({ playerId: "p7", count: 70 });
    expect(result.doubleKills[1]).toMatchObject({ playerId: "p6", count: 60 });
    expect(result.doubleKills[2]).toMatchObject({ playerId: "p5", count: 50 });
    expect(result.doubleKills[3]).toMatchObject({ playerId: "p4", count: 40 });
    expect(result.doubleKills[4]).toMatchObject({ playerId: "p3", count: 30 });
    expect(result.doubleKills[5]).toMatchObject({ playerId: "p2", count: 20 });
    // p1 (10) ficou fora do Top 6 (slice)

    // Outros campos de multikill estão vazios, portanto vazios (resiliência)
    expect(result.tripleKills).toHaveLength(0);
    expect(result.quadKills).toHaveLength(0);
    expect(result.aces).toHaveLength(0);
  });
});

describe("getPerformanceExtremesFromDataset e getWorstRecordsFromDataset", () => {
  it("deve incluir partida com < 5 kills como pior atuação se o jogador teve participação substancial (deaths >= 10)", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Jogador 1", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // 5 partidas para atingir MIN_PLAYER_MATCHES = 5
        { playerId: "p1", kills: 15, deaths: 12, rating: 1.10, adr: 80, match: { id: "m1", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 14, deaths: 13, rating: 1.05, adr: 75, match: { id: "m2", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 16, deaths: 11, rating: 1.15, adr: 85, match: { id: "m3", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 15, deaths: 12, rating: 1.10, adr: 80, match: { id: "m4", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        // Partida horrível legítima: 3 kills, 16 mortes (rating 0.10)
        { playerId: "p1", kills: 3, deaths: 16, rating: 0.10, adr: 30, match: { id: "m5", map: { name: "Inferno" }, scoreTeamA: 7, scoreTeamB: 13 } },
      ],
    };

    dataset.statsByPlayer.set("p1", dataset.allStats);

    // @ts-ignore
    const extremes = getPerformanceExtremesFromDataset(dataset);
    expect(extremes.worst).not.toBeNull();
    expect(extremes.worst?.kills).toBe(3);
    expect(extremes.worst?.deaths).toBe(16);
    expect(extremes.worst?.rating).toBe(0.10);

    // @ts-ignore
    const worstRecords = getWorstRecordsFromDataset(dataset);
    const worstRatingRecord = worstRecords.find(r => r.category === "Pior Rating em Jogo");
    expect(worstRatingRecord).toBeDefined();
    expect(worstRatingRecord?.value).toBe("0.10");
  });

  it("deve ignorar desconexão ou substituição precoce (ex: 0 kills, 1 morte) como pior atuação", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "Jogador 1", avatarUrl: null, levelGc: 10 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        { playerId: "p1", kills: 15, deaths: 12, rating: 1.10, adr: 80, match: { id: "m1", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 14, deaths: 13, rating: 1.05, adr: 75, match: { id: "m2", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 16, deaths: 11, rating: 1.15, adr: 85, match: { id: "m3", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        { playerId: "p1", kills: 15, deaths: 12, rating: 1.10, adr: 80, match: { id: "m4", map: { name: "Dust2" }, scoreTeamA: 13, scoreTeamB: 10 } },
        // Jogador caiu na 2ª rodada: 0 kills, 1 morte (rating 0.00)
        { playerId: "p1", kills: 0, deaths: 1, rating: 0.00, adr: 5, match: { id: "m5", map: { name: "Inferno" }, scoreTeamA: 13, scoreTeamB: 10 } },
      ],
    };

    dataset.statsByPlayer.set("p1", dataset.allStats);

    // @ts-ignore
    const extremes = getPerformanceExtremesFromDataset(dataset);
    // A pior atuação não deve ser a desconexão (0 kills, 1 morte), mas sim a partida válida com menor rating (m2 com rating 1.05)
    expect(extremes.worst?.rating).toBe(1.05);
  });
});

