import { describe, expect, it } from "vitest";
import {
  calculateLeaderDiff,
  formatLastSync,
  formatSeasonHeader,
} from "./season-podium";

describe("season-podium domain logic", () => {
  describe("calculateLeaderDiff", () => {
    it("deve retornar 'Empatado em pontos' quando as pontuações forem idênticas", () => {
      const result = calculateLeaderDiff(1.15, 1.15);
      expect(result.diff).toBe(0);
      expect(result.isTied).toBe(true);
      expect(result.formattedDiff).toBe("Empatado em pontos");
    });

    it("deve retornar 'Menos de 1 ponto atrás' para diferenças decimais menores que 1 (evitando '0 pontos atrás')", () => {
      // Caso real do banco: 1.139 vs 1.109
      const resultReal = calculateLeaderDiff(1.139, 1.109);
      expect(resultReal.diff).toBeCloseTo(0.03, 3);
      expect(resultReal.isTied).toBe(false);
      expect(resultReal.formattedDiff).toBe("Menos de 1 ponto atrás");

      // Caso de borda: diferença de 0.4 que em arredondamento inteiro viraria 0
      const resultSmall = calculateLeaderDiff(100.4, 100.0);
      expect(resultSmall.formattedDiff).toBe("Menos de 1 ponto atrás");
      expect(resultSmall.formattedDiff).not.toContain("0 pontos");
    });

    it("deve formatar corretamente para diferenças de 1 ponto no singular", () => {
      const result = calculateLeaderDiff(10.0, 9.0);
      expect(result.diff).toBe(1);
      expect(result.formattedDiff).toBe("1 ponto atrás do líder");
    });

    it("deve formatar corretamente para diferenças inteiras maiores (ex: 59 pontos atrás)", () => {
      const result = calculateLeaderDiff(1200, 1141);
      expect(result.diff).toBe(59);
      expect(result.formattedDiff).toBe("59 pontos atrás do líder");
    });
  });

  describe("formatLastSync", () => {
    it("deve retornar null para valores ausentes ou nulos", () => {
      expect(formatLastSync(null)).toBeNull();
      expect(formatLastSync(undefined)).toBeNull();
      expect(formatLastSync("invalid-date")).toBeNull();
    });

    it("deve converter e formatar no fuso America/Sao_Paulo (UTC-3)", () => {
      // 14:21 UTC em Outubro (horário padrão UTC-3) corresponde a 11:21
      const date = new Date("2026-10-27T14:21:11.486Z");
      const formatted = formatLastSync(date);
      expect(formatted).toBe("Dados atualizados em 27/10 às 11:21");
    });
  });

  describe("formatSeasonHeader", () => {
    it("deve formatar temporada ativa com prefixo e badge", () => {
      const res = formatSeasonHeader("Outubro/2026", "ACTIVE");
      expect(res.title).toBe("Temporada Outubro/2026");
      expect(res.isAllTime).toBe(false);
      expect(res.statusBadge).toEqual({
        label: "EM ANDAMENTO",
        variant: "good",
      });
    });

    it("deve formatar temporada encerrada com badge ENCERRADA", () => {
      const res = formatSeasonHeader("Setembro/2026", "CLOSED");
      expect(res.title).toBe("Temporada Setembro/2026");
      expect(res.statusBadge).toEqual({
        label: "ENCERRADA",
        variant: "neutral",
      });
    });

    it("não deve duplicar a palavra Temporada se o nome já contiver", () => {
      const res = formatSeasonHeader("Temporada Outubro/2026", "ACTIVE");
      expect(res.title).toBe("Temporada Outubro/2026");
    });

    it("deve exibir 'Histórico Geral' e omitir status para All-Time/Carreira", () => {
      const res1 = formatSeasonHeader("Carreira (Histórico)", "CLOSED", "all");
      expect(res1.title).toBe("Histórico Geral");
      expect(res1.isAllTime).toBe(true);
      expect(res1.statusBadge).toBeNull();

      const res2 = formatSeasonHeader("all", "ALL", "all");
      expect(res2.title).toBe("Histórico Geral");
      expect(res2.isAllTime).toBe(true);
      expect(res2.statusBadge).toBeNull();
    });
  });
});
