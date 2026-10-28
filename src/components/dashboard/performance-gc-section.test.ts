import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { PerformanceGcSection } from "./performance-gc-section";

describe("PerformanceGcSection - Aba Multikills", () => {
  const mockStats = {
    sampleSize: 10,
    averageDamage: 85,
    averageGcRating: 1.15,
    totalDoubleKills: 45,
    totalTripleKills: 15,
    totalQuadKills: 4,
    totalAces: 1,
  };

  const mockLeaderboards = {
    aces: [
      { playerId: "p-ace-1", nickname: "Fallen", avatarUrl: null, count: 1 },
    ],
    quadKills: [
      { playerId: "p-quad-1", nickname: "Coldzera", avatarUrl: null, count: 4 },
      { playerId: "p-quad-2", nickname: "Taco", avatarUrl: null, count: 2 },
      { playerId: "p-quad-3", nickname: "Fer", avatarUrl: null, count: 2 }, // Empate proposital com Taco
    ],
    tripleKills: [
      { playerId: "p-tri-1", nickname: "Fer", avatarUrl: null, count: 8 },
      { playerId: "p-tri-2", nickname: "Coldzera", avatarUrl: null, count: 5 },
    ],
    doubleKills: [
      { playerId: "p-dbl-1", nickname: "Fnx", avatarUrl: null, count: 20 },
      { playerId: "p-dbl-2", nickname: "Fallen", avatarUrl: null, count: 18 },
      { playerId: "p-dbl-3", nickname: "Coldzera", avatarUrl: null, count: 12 },
    ],
  };

  it("renderiza a aba multikills com grid responsivo de 1 coluna mobile e 2 colunas desktop", () => {
    const html = renderToString(
      React.createElement(PerformanceGcSection, {
        stats: mockStats,
        multikillsLeaderboards: mockLeaderboards,
      })
    );

    // Grid deve ter classes responsivas
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("md:grid-cols-2");
  });

  it("renderiza cabeçalhos compactos com ícones e badges 5K, 4K, 3K e 2K", () => {
    const html = renderToString(
      React.createElement(PerformanceGcSection, {
        stats: mockStats,
        multikillsLeaderboards: mockLeaderboards,
      })
    );

    expect(html).toContain("Aces");
    expect(html).toContain("5K");
    expect(html).toContain("Quad Kills");
    expect(html).toContain("4K");
    expect(html).toContain("Triple Kills");
    expect(html).toContain("3K");
    expect(html).toContain("Double Kills");
    expect(html).toContain("2K");
  });

  it("destaca a primeira linha (#1) com nome e contagem em evidência", () => {
    const html = renderToString(
      React.createElement(PerformanceGcSection, {
        stats: mockStats,
        multikillsLeaderboards: mockLeaderboards,
      })
    );

    // Deve conter #1 destacado
    expect(html).toContain("#1");
    expect(html).toContain("Fallen");
    expect(html).toContain("Coldzera");
  });

  it("gera barras horizontais proporcionais ao maior valor do card, com valores iguais produzindo barras iguais", () => {
    const html = renderToString(
      React.createElement(PerformanceGcSection, {
        stats: mockStats,
        multikillsLeaderboards: mockLeaderboards,
      })
    );

    // Em Quad Kills: Coldzera tem 4 (100%), Taco tem 2 (50%), Fer tem 2 (50%)
    // Deve haver barra de 100% no líder
    expect(html).toContain("width:100%");
    // Taco e Fer têm 2 kills cada, portanto devem gerar width:50%
    const matches50 = html.match(/width:50%/g);
    expect(matches50).not.toBeNull();
    // Pelo menos 2 ocorrências de width:50% para Taco e Fer
    expect(matches50!.length).toBeGreaterThanOrEqual(2);
  });

  it("corrige espaço vazio do card Aces com alinhamento no topo (justify-start)", () => {
    const html = renderToString(
      React.createElement(PerformanceGcSection, {
        stats: mockStats,
        multikillsLeaderboards: mockLeaderboards,
      })
    );

    // Container do card deve ter justify-start
    expect(html).toContain("justify-start");
    // Não deve conter justify-between no card de multikills
    expect(html).not.toContain("flex flex-col justify-between gap-3 p-3.5 bg-surface-deck");
  });

  it("renderiza estado vazio elegante quando todas as categorias estão zeradas", () => {
    const emptyLeaderboards = {
      aces: [],
      quadKills: [],
      tripleKills: [],
      doubleKills: [],
    };

    const html = renderToString(
      React.createElement(PerformanceGcSection, {
        stats: mockStats,
        multikillsLeaderboards: emptyLeaderboards,
      })
    );

    expect(html).toContain("Nenhuma multikill registrada nesta temporada.");
  });

  it("renderiza mensagem sutil no card quando apenas uma categoria está zerada", () => {
    const partialLeaderboards = {
      ...mockLeaderboards,
      aces: [], // Aces zerado
    };

    const html = renderToString(
      React.createElement(PerformanceGcSection, {
        stats: mockStats,
        multikillsLeaderboards: partialLeaderboards,
      })
    );

    expect(html).toContain("Nenhum registro de aces no período.");
    expect(html).toContain("Quad Kills");
  });
});
