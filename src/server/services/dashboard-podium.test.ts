import { describe, expect, it } from "vitest";
import {
  calculateLeaderDiff,
  formatLastSync,
  formatSeasonHeader,
  type OfficialTop3Entry,
} from "@/lib/season-podium";

describe("Dashboard Header - Top 3 Oficial & Telemetria", () => {
  const mockLeader: OfficialTop3Entry = {
    player: { id: "p1", nickname: "PERNA PELUDA", avatarUrl: "https://avatar/p1.png" },
    matchesPlayed: 62,
    value: 1.139,
    rawScore: 1.139,
    rawRating: 1.171,
    isEligible: true,
  };

  const mockRunner1: OfficialTop3Entry = {
    player: { id: "p2", nickname: "TRAVIS SCOUTTT", avatarUrl: null },
    matchesPlayed: 67,
    value: 1.109,
    rawScore: 1.109,
    rawRating: 1.119,
    isEligible: true,
  };

  const mockRunner2: OfficialTop3Entry = {
    player: { id: "p3", nickname: "Flp", avatarUrl: "https://avatar/p3.png" },
    matchesPlayed: 85,
    value: 1.064,
    rawScore: 1.064,
    rawRating: 1.074,
    isEligible: true,
  };

  const mockRunner3: OfficialTop3Entry = {
    player: { id: "p4", nickname: "LorD", avatarUrl: null },
    matchesPlayed: 45,
    value: 1.031,
    rawScore: 1.031,
    rawRating: 1.026,
    isEligible: true,
  };

  describe("Correspondência entre Top 3 e Classificação Completa", () => {
    it("deve extrair exatamente os 3 primeiros colocados na mesma ordem da classificação", () => {
      const fullRanking = [mockLeader, mockRunner1, mockRunner2, mockRunner3];
      const top3 = fullRanking.slice(0, 3);

      expect(top3).toHaveLength(3);
      expect(top3[0].player?.nickname).toBe("PERNA PELUDA");
      expect(top3[1].player?.nickname).toBe("TRAVIS SCOUTTT");
      expect(top3[2].player?.nickname).toBe("Flp");
      // O 4º colocado não entra no Top 3
      expect(top3.some((p) => p.player?.id === "p4")).toBe(false);
    });

    it("o primeiro colocado do Top 3 deve ser idêntico ao líder oficial", () => {
      const fullRanking = [mockLeader, mockRunner1, mockRunner2];
      const leader = fullRanking[0];
      expect(leader.player?.id).toBe("p1");
      expect(leader.value).toBe(1.139);
    });
  });

  describe("Cálculo e formatação de diferenças em relação ao líder", () => {
    it("deve calcular a diferença com valores numéricos de origem e formatar com 3 casas em pt-BR", () => {
      // 1.139 - 1.109 = 0.030
      const diff1 = calculateLeaderDiff(mockLeader.rawScore, mockRunner1.rawScore);
      expect(diff1.diff).toBeCloseTo(0.03, 3);
      expect(diff1.isTied).toBe(false);
      expect(diff1.formattedDiff).toBe("0,030 atrás do líder");

      // 1.139 - 1.064 = 0.075
      const diff2 = calculateLeaderDiff(mockLeader.rawScore, mockRunner2.rawScore);
      expect(diff2.diff).toBeCloseTo(0.075, 3);
      expect(diff2.isTied).toBe(false);
      expect(diff2.formattedDiff).toBe("0,075 atrás do líder");
    });

    it("deve tratar empate real em pontuação exibindo 'Mesmo score do líder'", () => {
      const tiedRunner: OfficialTop3Entry = {
        player: { id: "p-tie", nickname: "Clone", avatarUrl: null },
        matchesPlayed: 60,
        value: 1.139,
        rawScore: 1.139,
        rawRating: 1.160,
        isEligible: true,
      };

      const diffTie = calculateLeaderDiff(mockLeader.rawScore, tiedRunner.rawScore);
      expect(diffTie.diff).toBe(0);
      expect(diffTie.isTied).toBe(true);
      expect(diffTie.formattedDiff).toBe("Mesmo score do líder");
    });

    it("deve retornar 'Menos de 0,001 atrás do líder' para diferenças positivas que arredondam para 0,000", () => {
      const diffSmall = calculateLeaderDiff(1.139, 1.1388);
      expect(diffSmall.formattedDiff).toBe("Menos de 0,001 atrás do líder");
    });

    it("deve omitir a mensagem para pontuações ausentes ou diferenças negativas", () => {
      expect(calculateLeaderDiff(null, mockRunner1.rawScore).formattedDiff).toBeNull();
      expect(calculateLeaderDiff(mockLeader.rawScore, null).formattedDiff).toBeNull();
      expect(calculateLeaderDiff(1.100, 1.139).formattedDiff).toBeNull();
    });
  });

  describe("Composição do Pódio para Diferentes Quantidades de Elegíveis", () => {
    it("quando houver 0 elegíveis, Top 3 é vazio (estado indisponível)", () => {
      const emptyRanking: OfficialTop3Entry[] = [];
      const top3 = emptyRanking.slice(0, 3);
      expect(top3).toHaveLength(0);
    });

    it("quando houver apenas 1 elegível, Top 3 tem apenas o líder", () => {
      const singleRanking = [mockLeader];
      const top3 = singleRanking.slice(0, 3);
      expect(top3).toHaveLength(1);
      expect(top3[0].player?.nickname).toBe("PERNA PELUDA");
      expect(top3[1]).toBeUndefined();
    });

    it("quando houver 2 elegíveis, Top 3 tem líder e vice, sem inventar 3º colocado", () => {
      const twoRanking = [mockLeader, mockRunner1];
      const top3 = twoRanking.slice(0, 3);
      expect(top3).toHaveLength(2);
      expect(top3[0].player?.nickname).toBe("PERNA PELUDA");
      expect(top3[1].player?.nickname).toBe("TRAVIS SCOUTTT");
      expect(top3[2]).toBeUndefined();
    });

    it("quando houver 3 ou mais elegíveis, Top 3 exibe exatamente 3 jogadores distintos", () => {
      const fullRanking = [mockLeader, mockRunner1, mockRunner2, mockRunner3];
      const top3 = fullRanking.slice(0, 3);
      expect(top3).toHaveLength(3);
      const uniqueIds = new Set(top3.map((e) => e.player?.id));
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe("Ordenação Oficial e Desempates", () => {
    it("deve respeitar a ordem: rawScore DESC -> rawRating DESC -> matchesPlayed DESC -> id ASC", () => {
      const candidates = [
        // Empate no score com pB, mas pA tem rating maior
        {
          id: "pA",
          rawScore: 1.100,
          rawRating: 1.150,
          matchesPlayed: 20,
        },
        {
          id: "pB",
          rawScore: 1.100,
          rawRating: 1.120,
          matchesPlayed: 30,
        },
        // Pontuação maior
        {
          id: "pTop",
          rawScore: 1.200,
          rawRating: 1.100,
          matchesPlayed: 15,
        },
        // Empate em score e rating, mas pC tem mais partidas que pD
        {
          id: "pC",
          rawScore: 1.050,
          rawRating: 1.050,
          matchesPlayed: 25,
        },
        {
          id: "pD",
          rawScore: 1.050,
          rawRating: 1.050,
          matchesPlayed: 18,
        },
      ];

      const sorted = [...candidates].sort((a, b) => {
        if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
        if (b.rawRating !== a.rawRating) return b.rawRating - a.rawRating;
        if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
        return a.id.localeCompare(b.id);
      });

      expect(sorted.map((s) => s.id)).toEqual(["pTop", "pA", "pB", "pC", "pD"]);
    });
  });

  describe("Tratamento de Período, Temporadas e Sincronização", () => {
    it("deve formatar 'Histórico Geral' e omitir status ativo para All-Time", () => {
      const headerAll = formatSeasonHeader("Carreira (Histórico)", "CLOSED", "all");
      expect(headerAll.title).toBe("Histórico Geral");
      expect(headerAll.isAllTime).toBe(true);
      expect(headerAll.statusBadge).toBeNull();
    });

    it("deve formatar 'Temporada Outubro/2026' com badge EM ANDAMENTO", () => {
      const headerActive = formatSeasonHeader("Outubro/2026", "ACTIVE", "cmuow54kq223v01rxwlfgd6o9");
      expect(headerActive.title).toBe("Temporada Outubro/2026");
      expect(headerActive.isAllTime).toBe(false);
      expect(headerActive.statusBadge?.label).toBe("EM ANDAMENTO");
      expect(headerActive.statusBadge?.variant).toBe("good");
    });

    it("deve formatar 'Temporada Setembro/2026' com badge ENCERRADA", () => {
      const headerClosed = formatSeasonHeader("Setembro/2026", "CLOSED", "season-sep-2026");
      expect(headerClosed.title).toBe("Temporada Setembro/2026");
      expect(headerClosed.statusBadge?.label).toBe("ENCERRADA");
      expect(headerClosed.statusBadge?.variant).toBe("neutral");
    });

    it("deve formatar corretamente o timestamp de sincronização no fuso brasileiro", () => {
      const date = new Date("2026-10-27T14:21:11.486Z");
      expect(formatLastSync(date)).toBe("Dados atualizados em 27/10 às 11:21");
      expect(formatLastSync(null)).toBeNull();
    });
  });
});
