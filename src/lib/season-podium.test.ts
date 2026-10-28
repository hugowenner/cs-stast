import { describe, expect, it } from "vitest";
import {
  calculateLeaderDiff,
  formatLastSync,
  formatSeasonHeader,
} from "./season-podium";

describe("season-podium domain logic", () => {
  describe("calculateLeaderDiff", () => {
    it("deve retornar 'Mesmo score do líder' quando as pontuações forem idênticas (empate real)", () => {
      const result = calculateLeaderDiff(1.15, 1.15);
      expect(result.diff).toBe(0);
      expect(result.isTied).toBe(true);
      expect(result.formattedDiff).toBe("Mesmo score do líder");
    });

    it("deve formatar a diferença real com 3 casas decimais em pt-BR (ex: 1.139 vs 1.109 -> '0,030 atrás do líder')", () => {
      const resultRunner1 = calculateLeaderDiff(1.139, 1.109);
      expect(resultRunner1.diff).toBeCloseTo(0.03, 3);
      expect(resultRunner1.isTied).toBe(false);
      expect(resultRunner1.formattedDiff).toBe("0,030 atrás do líder");

      const resultRunner2 = calculateLeaderDiff(1.139, 1.064);
      expect(resultRunner2.diff).toBeCloseTo(0.075, 3);
      expect(resultRunner2.isTied).toBe(false);
      expect(resultRunner2.formattedDiff).toBe("0,075 atrás do líder");
    });

    it("deve retornar 'Menos de 0,001 atrás do líder' para diferença positiva que arredonda para 0,000", () => {
      const resultSmall = calculateLeaderDiff(1.139, 1.1389);
      expect(resultSmall.isTied).toBe(false);
      expect(resultSmall.formattedDiff).toBe("Menos de 0,001 atrás do líder");

      const resultTiny = calculateLeaderDiff(1.139, 1.1386); // diff 0.0004
      expect(resultTiny.formattedDiff).toBe("Menos de 0,001 atrás do líder");
    });

    it("deve omitir a diferença (null) quando o score for ausente, nulo ou inválido", () => {
      expect(calculateLeaderDiff(null, 1.109).formattedDiff).toBeNull();
      expect(calculateLeaderDiff(1.139, null).formattedDiff).toBeNull();
      expect(calculateLeaderDiff(undefined, 1.109).formattedDiff).toBeNull();
      expect(calculateLeaderDiff(1.139, NaN).formattedDiff).toBeNull();
    });

    it("deve omitir a diferença (null) se a diferença for negativa (runner com score maior)", () => {
      const resultNegative = calculateLeaderDiff(1.100, 1.150);
      expect(resultNegative.formattedDiff).toBeNull();
      expect(resultNegative.diff).toBeLessThan(0);
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
