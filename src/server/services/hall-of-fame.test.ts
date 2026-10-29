import { describe, it, expect } from "vitest";
import {
  getHallOfFameRecordsFromDataset,
  getWorstRecordsFromDataset,
  type CompetitiveDataset,
} from "./competitive.service";

describe("Hall of Fame - Records da Temporada & Anomalias", () => {
  it("deve identificar recordes individuais com contexto enriquecido e placar orientado", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "LorD", avatarUrl: null, levelGc: 18 },
        { id: "p2", nickname: "TRAVIS", avatarUrl: null, levelGc: 19 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        {
          playerId: "p1",
          matchId: "m1",
          team: "A",
          kills: 28,
          deaths: 14,
          headshots: 14,
          rating: 1.85,
          adr: 125.0,
          damage: 2500,
          eloAfter: 1620,
          doubleKills: 4,
          tripleKills: 2,
          quadKills: 0,
          aces: 0,
          clutchesWon: 0,
          match: {
            id: "m1",
            playedAt: new Date("2026-10-10T21:00:00Z"),
            map: { name: "de_dust2" },
            scoreTeamA: 13,
            scoreTeamB: 7,
          },
        },
        {
          playerId: "p2",
          matchId: "m1",
          team: "A",
          kills: 18,
          deaths: 12,
          headshots: 9,
          rating: 1.20,
          adr: 85.0,
          damage: 1700,
          eloAfter: 1550,
          doubleKills: 2,
          tripleKills: 1,
          quadKills: 0,
          aces: 0,
          clutchesWon: 0,
          match: {
            id: "m1",
            playedAt: new Date("2026-10-10T21:00:00Z"),
            map: { name: "de_dust2" },
            scoreTeamA: 13,
            scoreTeamB: 7,
          },
        },
      ],
    } as unknown as CompetitiveDataset;

    dataset.statsByPlayer.set("p1", [dataset.allStats[0]]);
    dataset.statsByPlayer.set("p2", [dataset.allStats[1]]);

    const records = getHallOfFameRecordsFromDataset(dataset);
    const ratingRecord = records.find((r) => r.id === "elite-rating");

    expect(ratingRecord).toBeDefined();
    expect(ratingRecord?.title).toBe("Maior Rating em Jogo");
    expect(ratingRecord?.value).toBe("1.85");
    expect(ratingRecord?.playerName).toBe("LorD");
    expect(ratingRecord?.isShared).toBe(false);
    expect(ratingRecord?.holders).toHaveLength(1);

    const holder = ratingRecord?.holders?.[0];
    expect(holder?.player.nickname).toBe("LorD");
    expect(holder?.mapName).toBe("de_dust2");
    expect(holder?.cleanMapName).toBe("Dust2");
    expect(holder?.scoreFor).toBe(13);
    expect(holder?.scoreAgainst).toBe(7);
    expect(holder?.outcome).toBe("win");
    expect(holder?.scoreFormatted).toBe("13x7 (Vitória)");
    expect(holder?.participationContext).toBe("2 monitorados no mesmo time");
  });

  it("deve reconhecer múltiplos detentores empatados no K/D em jogo (ex: 6.00 de Flp e PERNA PELUDA)", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "PERNA PELUDA", avatarUrl: null, levelGc: 17 },
        { id: "p2", nickname: "Flp", avatarUrl: null, levelGc: 16 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        {
          playerId: "p1",
          matchId: "m_dust",
          team: "A",
          kills: 18,
          deaths: 3, // K/D = 6.00
          headshots: 9,
          rating: 1.95,
          adr: 110.0,
          eloAfter: 1500,
          doubleKills: 2,
          tripleKills: 1,
          quadKills: 0,
          aces: 0,
          clutchesWon: 0,
          match: {
            id: "m_dust",
            playedAt: new Date("2026-10-06T21:40:00Z"),
            map: { name: "de_dust2" },
            scoreTeamA: 13,
            scoreTeamB: 6,
          },
        },
        {
          playerId: "p2",
          matchId: "m_dust",
          team: "A",
          kills: 18,
          deaths: 3, // K/D = 6.00
          headshots: 8,
          rating: 1.90,
          adr: 105.0,
          eloAfter: 1480,
          doubleKills: 3,
          tripleKills: 0,
          quadKills: 0,
          aces: 0,
          clutchesWon: 0,
          match: {
            id: "m_dust",
            playedAt: new Date("2026-10-06T21:40:00Z"),
            map: { name: "de_dust2" },
            scoreTeamA: 13,
            scoreTeamB: 6,
          },
        },
      ],
    } as unknown as CompetitiveDataset;

    dataset.statsByPlayer.set("p1", [dataset.allStats[0]]);
    dataset.statsByPlayer.set("p2", [dataset.allStats[1]]);

    const records = getHallOfFameRecordsFromDataset(dataset);
    const kdRecord = records.find((r) => r.id === "elite-kd");

    expect(kdRecord).toBeDefined();
    expect(kdRecord?.value).toBe("6.00 K/D");
    expect(kdRecord?.isShared).toBe(true);
    expect(kdRecord?.sharedCount).toBe(2);
    // Ordenação determinística alfabética: Flp antes de PERNA PELUDA
    expect(kdRecord?.playerName).toBe("Flp e PERNA PELUDA");
    expect(kdRecord?.holders).toHaveLength(2);
    expect(kdRecord?.holders?.[0].player.nickname).toBe("Flp");
    expect(kdRecord?.holders?.[1].player.nickname).toBe("PERNA PELUDA");
  });

  it("deve reconhecer múltiplos detentores empatados em Anomalias (ex: 3 jogadores com 34 mortes)", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "PERNA PELUDA", avatarUrl: null, levelGc: 17 },
        { id: "p2", nickname: "Flp", avatarUrl: null, levelGc: 16 },
        { id: "p3", nickname: "Maop Bonham", avatarUrl: null, levelGc: 15 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        {
          playerId: "p1",
          matchId: "m_ot1",
          team: "A",
          kills: 25,
          deaths: 34,
          headshots: 10,
          rating: 0.90,
          adr: 78.0,
          eloAfter: 1400,
          match: {
            id: "m_ot1",
            playedAt: new Date("2026-10-08T22:00:00Z"),
            map: { name: "de_dust2" },
            scoreTeamA: 22,
            scoreTeamB: 20,
          },
        },
        {
          playerId: "p2",
          matchId: "m_ot1",
          team: "A",
          kills: 22,
          deaths: 34,
          headshots: 11,
          rating: 0.85,
          adr: 72.0,
          eloAfter: 1390,
          match: {
            id: "m_ot1",
            playedAt: new Date("2026-10-08T22:00:00Z"),
            map: { name: "de_dust2" },
            scoreTeamA: 22,
            scoreTeamB: 20,
          },
        },
        {
          playerId: "p3",
          matchId: "m_ot2",
          team: "B",
          kills: 20,
          deaths: 34,
          headshots: 8,
          rating: 0.80,
          adr: 65.0,
          eloAfter: 1350,
          match: {
            id: "m_ot2",
            playedAt: new Date("2026-10-03T20:00:00Z"),
            map: { name: "de_mirage" },
            scoreTeamA: 22,
            scoreTeamB: 20,
          },
        },
      ],
    } as unknown as CompetitiveDataset;

    dataset.statsByPlayer.set("p1", [dataset.allStats[0]]);
    dataset.statsByPlayer.set("p2", [dataset.allStats[1]]);
    dataset.statsByPlayer.set("p3", [dataset.allStats[2]]);

    const worstRecords = getWorstRecordsFromDataset(dataset);
    const deathsRecord = worstRecords.find((r) => r.id === "worst-deaths");

    expect(deathsRecord).toBeDefined();
    expect(deathsRecord?.value).toBe("34 mortes");
    expect(deathsRecord?.isShared).toBe(true);
    expect(deathsRecord?.sharedCount).toBe(3);
    expect(deathsRecord?.holders).toHaveLength(3);
    // Ordenação determinística: Flp, Maop Bonham, PERNA PELUDA
    expect(deathsRecord?.holders?.[0].player.nickname).toBe("Flp");
    expect(deathsRecord?.holders?.[1].player.nickname).toBe("Maop Bonham");
    expect(deathsRecord?.holders?.[2].player.nickname).toBe("PERNA PELUDA");
    // Placar orientado para p3 (Team B: 20x22 Derrota OT)
    expect(deathsRecord?.holders?.[1].scoreFormatted).toBe("20x22 (Derrota OT)");
  });

  it("deve rastrear sequência de vitórias compartilhada (LorD e TRAVIS com 6 vitórias)", () => {
    const makeMatch = (id: string, dateStr: string, won: boolean) => ({
      id,
      playedAt: new Date(dateStr),
      map: { id: "map-1", name: "de_dust2", imageUrl: null },
      session: { id: "sess-1", name: "Sessão 1", date: new Date(dateStr), createdAt: new Date(dateStr) },
      seasonId: "season-1",
      sessionId: "sess-1",
      trackedPlayersCount: 5,
      scoreTeamA: won ? 13 : 8,
      scoreTeamB: won ? 8 : 13,
    } as any);

    const p1Matches = [
      // 6 vitórias seguidas de 05/10 a 10/10, depois 1 derrota
      { playerId: "p1", team: "A", match: makeMatch("m1_1", "2026-10-05T20:00:00Z", true) },
      { playerId: "p1", team: "A", match: makeMatch("m1_2", "2026-10-06T20:00:00Z", true) },
      { playerId: "p1", team: "A", match: makeMatch("m1_3", "2026-10-07T20:00:00Z", true) },
      { playerId: "p1", team: "A", match: makeMatch("m1_4", "2026-10-08T20:00:00Z", true) },
      { playerId: "p1", team: "A", match: makeMatch("m1_5", "2026-10-09T20:00:00Z", true) },
      { playerId: "p1", team: "A", match: makeMatch("m1_6", "2026-10-10T20:00:00Z", true) },
      { playerId: "p1", team: "A", match: makeMatch("m1_7", "2026-10-11T20:00:00Z", false) },
    ];

    const p2Matches = [
      // 6 vitórias seguidas de 06/10 a 07/10, depois 1 derrota
      { playerId: "p2", team: "A", match: makeMatch("m2_1", "2026-10-06T18:00:00Z", true) },
      { playerId: "p2", team: "A", match: makeMatch("m2_2", "2026-10-06T20:00:00Z", true) },
      { playerId: "p2", team: "A", match: makeMatch("m2_3", "2026-10-06T22:00:00Z", true) },
      { playerId: "p2", team: "A", match: makeMatch("m2_4", "2026-10-07T18:00:00Z", true) },
      { playerId: "p2", team: "A", match: makeMatch("m2_5", "2026-10-07T20:00:00Z", true) },
      { playerId: "p2", team: "A", match: makeMatch("m2_6", "2026-10-07T22:00:00Z", true) },
      { playerId: "p2", team: "A", match: makeMatch("m2_7", "2026-10-08T20:00:00Z", false) },
    ];

    // Ordenados desc por playedAt como no Prisma
    const p1Stats = [...p1Matches].reverse();
    const p2Stats = [...p2Matches].reverse();

    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "LorD", avatarUrl: null, levelGc: 18 },
        { id: "p2", nickname: "TRAVIS", avatarUrl: null, levelGc: 19 },
      ],
      statsByPlayer: new Map(),
      allStats: [...p1Stats, ...p2Stats],
    } as unknown as CompetitiveDataset;

    dataset.statsByPlayer.set("p1", p1Stats as any);
    dataset.statsByPlayer.set("p2", p2Stats as any);

    const records = getHallOfFameRecordsFromDataset(dataset);
    const streakRecord = records.find((r) => r.id === "elite-win-streak");

    expect(streakRecord).toBeDefined();
    expect(streakRecord?.value).toBe("6 vitórias");
    expect(streakRecord?.isShared).toBe(true);
    expect(streakRecord?.sharedCount).toBe(2);
    expect(streakRecord?.holders).toHaveLength(2);
    expect(streakRecord?.holders?.[0].player.nickname).toBe("LorD");
    expect(streakRecord?.holders?.[1].player.nickname).toBe("TRAVIS");

    expect(streakRecord?.holders?.[0].individualStreak?.count).toBe(6);
    expect(streakRecord?.holders?.[0].individualStreak?.status).toBe("ended");
    expect(streakRecord?.holders?.[0].individualStreak?.endedReason).toBe("Encerrada por derrota");
  });

  it("deve sinalizar indisponibilidade de clutches quando a telemetria for 0 para todos", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "LorD", avatarUrl: null, levelGc: 18 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        {
          playerId: "p1",
          matchId: "m1",
          team: "A",
          kills: 20,
          deaths: 10,
          rating: 1.4,
          adr: 90,
          clutchesWon: 0,
          clutch1v1Wins: 0,
          clutch1v2Wins: 0,
          match: {
            id: "m1",
            playedAt: new Date(),
            map: { name: "de_dust2" },
            scoreTeamA: 13,
            scoreTeamB: 5,
          },
        },
      ],
    } as unknown as CompetitiveDataset;

    dataset.statsByPlayer.set("p1", dataset.allStats);

    const records = getHallOfFameRecordsFromDataset(dataset);
    const clutchRecord = records.find((r) => r.id === "elite-clutch");

    expect(clutchRecord).toBeDefined();
    expect(clutchRecord?.availability).toBe("unavailable");
    expect(clutchRecord?.value).toBe("Indisponível");
    expect(clutchRecord?.holders).toHaveLength(0);
  });

  it("deve exibir rótulos modernos para ELO GC e Índice Combinado", () => {
    const dataset = {
      activePlayers: [
        { id: "p1", nickname: "LorD", avatarUrl: null, levelGc: 18 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        {
          playerId: "p1",
          matchId: "m1",
          team: "A",
          kills: 25,
          deaths: 10,
          headshots: 12,
          rating: 2.10,
          adr: 145.0,
          eloAfter: 1643,
          match: {
            id: "m1",
            playedAt: new Date("2026-10-06T20:00:00Z"),
            map: { name: "de_dust2" },
            scoreTeamA: 13,
            scoreTeamB: 5,
          },
        },
      ],
    } as unknown as CompetitiveDataset;

    dataset.statsByPlayer.set("p1", dataset.allStats);

    const records = getHallOfFameRecordsFromDataset(dataset);
    const eloRecord = records.find((r) => r.id === "elite-elo");
    const impactRecord = records.find((r) => r.id === "elite-combined-impact");

    expect(eloRecord?.title).toBe("Maior ELO GC registrado");
    expect(eloRecord?.value).toBe("1643 pts GC");

    expect(impactRecord?.title).toBe("Maior índice combinado de Rating e ADR");
    expect(impactRecord?.value).toBe("2.10 Rating / 145.0 ADR");
  });
});
