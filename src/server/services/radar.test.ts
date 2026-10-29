import { describe, expect, it } from "vitest";
import {
  getGroupRadarFromDataset,
  type CompetitiveDataset,
  type SeasonComparisonEntry,
} from "./competitive.service";

describe("Radar do Grupo - Testes Direcionados de Regra de Negócio", () => {
  const activePlayers = [
    { id: "p1", nickname: "Player 1", avatarUrl: null, levelGc: 15 },
    { id: "p2", nickname: "Player 2", avatarUrl: null, levelGc: 16 },
    { id: "p3", nickname: "Player 3", avatarUrl: null, levelGc: 14 },
    { id: "p4", nickname: "Player 4", avatarUrl: null, levelGc: 17 },
    { id: "p5", nickname: "Player 5", avatarUrl: null, levelGc: 18 },
  ];

  function createMockDataset(matches: any[]): CompetitiveDataset {
    const allStats: any[] = [];
    const statsByPlayer = new Map<string, any[]>();
    for (const p of activePlayers) statsByPlayer.set(p.id, []);

    for (const m of matches) {
      for (const st of m.stats) {
        const statRow = {
          id: `stat-${m.id}-${st.playerId}`,
          matchId: m.id,
          playerId: st.playerId,
          team: st.team,
          rating: st.rating ?? 1.0,
          adr: 80,
          kills: 15,
          deaths: 12,
          assists: 3,
          headshots: 7,
          player: activePlayers.find((p) => p.id === st.playerId),
          match: {
            id: m.id,
            sessionId: m.sessionId ?? "session-1",
            playedAt: m.playedAt,
            scoreTeamA: m.scoreTeamA,
            scoreTeamB: m.scoreTeamB,
            durationSeconds: 2400,
            trackedPlayersCount: m.stats.length,
            session: m.session ?? {
              id: m.sessionId ?? "session-1",
              name: "Sessão Teste",
              date: m.playedAt,
            },
            map: { id: "map-1", name: "Mirage", imageUrl: null },
          },
        };
        allStats.push(statRow);
        statsByPlayer.get(st.playerId)?.push(statRow);
      }
    }

    return {
      activePlayers: activePlayers as any,
      statsByPlayer,
      allStats,
      seasonId: "season-test",
    };
  }

  const dummyComparison: SeasonComparisonEntry[] = [];

  // 1. Deduplicação e Lados A/B
  it("deduplica partidas únicas quando múltiplos monitorados jogam juntos e identifica lados A/B", () => {
    const playedAt = new Date("2026-10-20T20:00:00Z");
    const dataset = createMockDataset([
      {
        id: "match-1",
        playedAt,
        scoreTeamA: 13,
        scoreTeamB: 7,
        stats: [
          { playerId: "p1", team: "A" },
          { playerId: "p2", team: "A" },
        ],
      },
      {
        id: "match-2",
        playedAt: new Date("2026-10-21T20:00:00Z"),
        scoreTeamA: 5,
        scoreTeamB: 13,
        stats: [
          { playerId: "p1", team: "B" },
          { playerId: "p2", team: "B" },
        ],
      },
    ]);

    const radar = getGroupRadarFromDataset(dataset, dummyComparison);

    // Embora match-1 tenha 2 linhas de stats, o universo de partidas únicas deve ser 2
    expect(radar.matchComposition.totalUniverse).toBe(2);
    expect(radar.squadMomentum.eligibleMatchesCount).toBe(2);
    // Em match-1: monitorados no time A e scoreTeamA (13) > scoreTeamB (7) -> Vitória
    // Em match-2: monitorados no time B e scoreTeamB (13) > scoreTeamA (5) -> Vitória
    expect(radar.squadMomentum.recentBlock?.wins).toBe(2);
    expect(radar.squadMomentum.recentBlock?.winrate).toBe(100);
  });

  // 2. Confronto Interno
  it("identifica confrontos internos (monitorados em lados opostos) e os exclui do Momento Coletivo", () => {
    const dataset = createMockDataset([
      {
        id: "match-internal-1",
        playedAt: new Date("2026-10-22T20:00:00Z"),
        scoreTeamA: 13,
        scoreTeamB: 11,
        stats: [
          { playerId: "p1", team: "A" },
          { playerId: "p2", team: "B" },
        ],
      },
      {
        id: "match-collective-1",
        playedAt: new Date("2026-10-23T20:00:00Z"),
        scoreTeamA: 13,
        scoreTeamB: 8,
        stats: [
          { playerId: "p1", team: "A" },
          { playerId: "p2", team: "A" },
        ],
      },
    ]);

    const radar = getGroupRadarFromDataset(dataset, dummyComparison);

    expect(radar.matchComposition.totalUniverse).toBe(2);
    expect(radar.matchComposition.confrontationCount).toBe(1);
    expect(radar.matchComposition.smallTeamCount).toBe(1);
    // No Momento Coletivo, o confronto interno NÃO entra
    expect(radar.squadMomentum.eligibleMatchesCount).toBe(1);
  });

  // 3. Resultado Desconhecido / Empate e Saldo de Rounds
  it("trata empates e calcula o saldo de rounds para o lado monitorado", () => {
    const dataset = createMockDataset([
      {
        id: "match-tie",
        playedAt: new Date("2026-10-24T20:00:00Z"),
        scoreTeamA: 12,
        scoreTeamB: 12,
        stats: [
          { playerId: "p1", team: "A" },
          { playerId: "p2", team: "A" },
        ],
      },
      {
        id: "match-loss",
        playedAt: new Date("2026-10-25T20:00:00Z"),
        scoreTeamA: 13,
        scoreTeamB: 5,
        stats: [
          { playerId: "p1", team: "B" },
          { playerId: "p2", team: "B" },
        ],
      },
    ]);

    const radar = getGroupRadarFromDataset(dataset, dummyComparison);
    const block = radar.squadMomentum.recentBlock!;

    expect(block.matchesCount).toBe(2);
    expect(block.ties).toBe(1);
    expect(block.losses).toBe(1);
    // Saldo: match-tie (12 - 12 = 0) + match-loss (5 pró - 13 contra = -8) = -8
    expect(block.roundsFor).toBe(17);
    expect(block.roundsAgainst).toBe(25);
    expect(block.roundDiff).toBe(-8);
  });

  // 4. Limites dos Blocos e Pontos Percentuais (p.p.)
  it("gerencia limites dos blocos (<10 em formação, 10-19 parcial, >=20 com delta em p.p.)", () => {
    // 5 partidas: em formação
    const ds5 = createMockDataset(
      Array.from({ length: 5 }, (_, i) => ({
        id: `m-${i}`,
        playedAt: new Date(2026, 9, i + 1),
        scoreTeamA: 13,
        scoreTeamB: 7,
        stats: [
          { playerId: "p1", team: "A" },
          { playerId: "p2", team: "A" },
        ],
      }))
    );
    const r5 = getGroupRadarFromDataset(ds5, dummyComparison);
    expect(r5.squadMomentum.sampleStatus).toBe("insufficient");
    expect(r5.squadMomentum.hasComparison).toBe(false);
    expect(r5.squadMomentum.diffPp).toBeNull();
    expect(r5.squadMomentum.recentBlock?.matchesCount).toBe(5);

    // 15 partidas: amostra parcial (sem bloco comparativo)
    const ds15 = createMockDataset(
      Array.from({ length: 15 }, (_, i) => ({
        id: `m-${i}`,
        playedAt: new Date(2026, 9, i + 1),
        scoreTeamA: 13,
        scoreTeamB: 7,
        stats: [
          { playerId: "p1", team: "A" },
          { playerId: "p2", team: "A" },
        ],
      }))
    );
    const r15 = getGroupRadarFromDataset(ds15, dummyComparison);
    expect(r15.squadMomentum.sampleStatus).toBe("partial");
    expect(r15.squadMomentum.hasComparison).toBe(false);
    expect(r15.squadMomentum.diffPp).toBeNull();
    expect(r15.squadMomentum.recentBlock?.matchesCount).toBe(10);
    expect(r15.squadMomentum.previousBlock).toBeNull();

    // 20 partidas: comparação completa com diferença em pontos percentuais
    // Últimas 10 (mais recentes): 4 vitórias (40%)
    // 10 anteriores: 3 vitórias (30%)
    const ds20 = createMockDataset(
      Array.from({ length: 20 }, (_, i) => {
        // Ordenado por playedAt decrescente na função
        // i=0 a 9: mais recentes (playedAt 2026-10-20 a 2026-10-29)
        // i=10 a 19: anteriores (playedAt 2026-10-01 a 2026-10-10)
        const isRecent = i < 10;
        const isWin = isRecent ? i < 4 : i < 13; // 4 vitórias nas recentes (4/10=40%), 3 vitórias nas anteriores (3/10=30%)
        return {
          id: `m-${i}`,
          playedAt: new Date(2026, 9, 29 - i),
          scoreTeamA: isWin ? 13 : 8,
          scoreTeamB: isWin ? 8 : 13,
          stats: [
            { playerId: "p1", team: "A" },
            { playerId: "p2", team: "A" },
          ],
        };
      })
    );
    const r20 = getGroupRadarFromDataset(ds20, dummyComparison);
    expect(r20.squadMomentum.sampleStatus).toBe("full");
    expect(r20.squadMomentum.hasComparison).toBe(true);
    expect(r20.squadMomentum.recentBlock?.winrate).toBe(40);
    expect(r20.squadMomentum.previousBlock?.winrate).toBe(30);
    expect(r20.squadMomentum.diffPp).toBe(10); // +10 p.p.
  });

  // 5. Composição e Fechamento Exato do Universo
  it("fecha o universo total na composição das partidas e trata classificações anômalas", () => {
    const dataset = createMockDataset([
      // 1 monitorado (solo)
      { id: "m-solo", playedAt: new Date(2026, 9, 1), scoreTeamA: 13, scoreTeamB: 5, stats: [{ playerId: "p1", team: "A" }] },
      // 2 a 4 no mesmo time
      { id: "m-team3", playedAt: new Date(2026, 9, 2), scoreTeamA: 13, scoreTeamB: 5, stats: [{ playerId: "p1", team: "A" }, { playerId: "p2", team: "A" }, { playerId: "p3", team: "A" }] },
      // 5 no mesmo time
      { id: "m-team5", playedAt: new Date(2026, 9, 3), scoreTeamA: 13, scoreTeamB: 5, stats: [{ playerId: "p1", team: "A" }, { playerId: "p2", team: "A" }, { playerId: "p3", team: "A" }, { playerId: "p4", team: "A" }, { playerId: "p5", team: "A" }] },
      // Confronto interno
      { id: "m-conf", playedAt: new Date(2026, 9, 4), scoreTeamA: 13, scoreTeamB: 5, stats: [{ playerId: "p1", team: "A" }, { playerId: "p2", team: "B" }] },
      // Situação com 6 monitorados (exemplo anômalo no mesmo time)
      {
        id: "m-other",
        playedAt: new Date(2026, 9, 5),
        scoreTeamA: 13,
        scoreTeamB: 5,
        stats: [
          { playerId: "p1", team: "A" },
          { playerId: "p2", team: "A" },
          { playerId: "p3", team: "A" },
          { playerId: "p4", team: "A" },
          { playerId: "p5", team: "A" },
          { playerId: "p_extra", team: "A" },
        ],
      },
    ]);

    const radar = getGroupRadarFromDataset(dataset, dummyComparison);
    const comp = radar.matchComposition;

    expect(comp.totalUniverse).toBe(5);
    expect(comp.soloCount).toBe(1);
    expect(comp.smallTeamCount).toBe(1);
    expect(comp.fullTeamCount).toBe(1);
    expect(comp.confrontationCount).toBe(1);
    expect(comp.otherCount).toBe(1);

    // Soma exata
    expect(comp.soloCount + comp.smallTeamCount + comp.fullTeamCount + comp.confrontationCount + comp.otherCount).toBe(comp.totalUniverse);
  });

  // 6. Sessões e Fuso Horário
  it("agrupa sessões distintas com partidas coletivas e calcula média", () => {
    const dataset = createMockDataset([
      {
        id: "m-s1-1",
        sessionId: "sess-1",
        playedAt: new Date("2026-10-28T23:00:00Z"),
        scoreTeamA: 13,
        scoreTeamB: 10,
        stats: [{ playerId: "p1", team: "A" }, { playerId: "p2", team: "A" }],
        session: { id: "sess-1", name: "Sessão 28/10", date: new Date("2026-10-28T00:00:00Z") },
      },
      {
        id: "m-s1-2",
        sessionId: "sess-1",
        playedAt: new Date("2026-10-29T00:00:00Z"),
        scoreTeamA: 13,
        scoreTeamB: 10,
        stats: [{ playerId: "p1", team: "A" }, { playerId: "p2", team: "A" }],
        session: { id: "sess-1", name: "Sessão 28/10", date: new Date("2026-10-28T00:00:00Z") },
      },
      {
        id: "m-s2-1",
        sessionId: "sess-2",
        playedAt: new Date("2026-10-29T03:00:00Z"),
        scoreTeamA: 13,
        scoreTeamB: 10,
        stats: [{ playerId: "p1", team: "A" }, { playerId: "p2", team: "A" }],
        session: { id: "sess-2", name: "Sessão 29/10", date: new Date("2026-10-29T00:00:00Z") },
      },
      // Partida solo em outra sessão (não deve contar nas sessões coletivas)
      {
        id: "m-solo",
        sessionId: "sess-solo",
        playedAt: new Date("2026-10-29T10:00:00Z"),
        scoreTeamA: 13,
        scoreTeamB: 10,
        stats: [{ playerId: "p1", team: "A" }],
        session: { id: "sess-solo", name: "Sessão Solo", date: new Date("2026-10-29T00:00:00Z") },
      },
    ]);

    const radar = getGroupRadarFromDataset(dataset, dummyComparison);
    const pace = radar.sessionPace;

    // Apenas sess-1 e sess-2 contêm partidas coletivas no mesmo time
    expect(pace.totalEligibleSessions).toBe(2);
    expect(pace.totalEligibleMatches).toBe(3);
    expect(pace.averageMatchesPerSession).toBe(1.5);
    expect(pace.latestSession?.name).toBe("Sessão 29/10");
    expect(pace.latestSession?.eligibleMatchesCount).toBe(1);
    expect(pace.latestSession?.latestMatchTimeFormatted).toContain("Horário de Brasília");
  });

  // 7. Participação Recente e Janela de 7 Dias
  it("calcula participação recente na janela de 7 dias com base nos monitorados ativos", () => {
    const fixedNow = new Date("2026-10-29T12:00:00Z");
    const dataset = createMockDataset([
      // Partida dentro dos 7 dias (ex: 28/10) com p1 e p2
      {
        id: "m-recent",
        playedAt: new Date("2026-10-28T18:00:00Z"),
        scoreTeamA: 13,
        scoreTeamB: 10,
        stats: [{ playerId: "p1", team: "A" }, { playerId: "p2", team: "A" }],
      },
      // Partida fora dos 7 dias (ex: 15/10) com p3
      {
        id: "m-old",
        playedAt: new Date("2026-10-15T18:00:00Z"),
        scoreTeamA: 13,
        scoreTeamB: 10,
        stats: [{ playerId: "p3", team: "A" }],
      },
    ]);

    const radar = getGroupRadarFromDataset(dataset, dummyComparison, {
      startDate: new Date("2026-10-01T00:00:00Z"),
      endDate: new Date("2026-10-31T23:59:59Z"),
    });

    const part = radar.recentParticipation;

    // p1 e p2 jogaram na janela recente; p3 só jogou há mais de 7 dias; p4 e p5 não jogaram
    expect(part.activeCount).toBe(2);
    expect(part.totalActiveMonitored).toBe(activePlayers.length);
    expect(part.participatingPlayers.map((p) => p.id)).toEqual(expect.arrayContaining(["p1", "p2"]));
    expect(part.participatingPlayers.some((p) => p.id === "p3")).toBe(false);
  });

  // 8. Snapshots Legados
  it("garante que o bundle retornado contém campos legados preenchidos para retrocompatibilidade", () => {
    const dataset = createMockDataset([]);
    const radar = getGroupRadarFromDataset(dataset, dummyComparison);

    expect(radar).toHaveProperty("squadMomentum");
    expect(radar).toHaveProperty("sessionPace");
    expect(radar).toHaveProperty("matchComposition");
    expect(radar).toHaveProperty("recentParticipation");
    expect(radar).toHaveProperty("featuredPlayer");
    expect(radar).toHaveProperty("periodFact");
    expect(radar).toHaveProperty("attentionPoint");
  });
});
