import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ReisDosMapa } from "./reis-dos-mapas";
import type { MapSpecialist, MapPerformanceEntry } from "@/server/services/competitive.service";

describe("ReisDosMapa Component - Resiliência e Formatação", () => {
  it("não deve quebrar com TypeError quando spec.winrate for undefined (dados legados)", () => {
    const legacySpecialists: MapSpecialist[] = [
      {
        mapName: "Inferno",
        cleanMapName: "Inferno",
        player: {
          id: "p1",
          nickname: "Perna Peluda",
          avatarUrl: null,
          levelGc: 19,
        },
        rating: 1.28,
        minMatches: 5,
        podium: [],
        // winrate, wins e matches propositalmente undefined (como no snapshot antigo de setembro)
      },
    ];

    expect(() => {
      renderToString(
        React.createElement(ReisDosMapa, {
          specialists: legacySpecialists,
          mapWinrates: [],
          bestMap: null,
          worstMap: null,
        })
      );
    }).not.toThrow();

    const html = renderToString(
      React.createElement(ReisDosMapa, {
        specialists: legacySpecialists,
        mapWinrates: [],
        bestMap: null,
        worstMap: null,
      })
    );

    // Deve exibir "—" em vez de mascarar como "0%"
    expect(html).toContain("Perna Peluda");
    expect(html).toContain("—");
    expect(html).toContain("Sem dados de partidas");
    expect(html).not.toContain("0% vitórias");
  });

  it("deve exibir 0% quando o winrate for validamente zero (com partidas disputadas)", () => {
    const zeroWrSpecialists: MapSpecialist[] = [
      {
        mapName: "Mirage",
        cleanMapName: "Mirage",
        player: {
          id: "p0",
          nickname: "ZeroWinHero",
          avatarUrl: null,
          levelGc: 15,
        },
        rating: 0.92,
        wins: 0,
        matches: 5,
        winrate: 0,
        wilsonScore: 0,
        minMatches: 5,
        podium: [],
      },
    ];

    const html = renderToString(
      React.createElement(ReisDosMapa, {
        specialists: zeroWrSpecialists,
        mapWinrates: [],
        bestMap: null,
        worstMap: null,
      })
    );

    expect(html).toContain("ZeroWinHero");
    expect(html).toContain("0%");
    expect(html).toContain("0 vitórias em 5 partidas");
  });

  it("deve exibir winrate formatado corretamente para valores positivos", () => {
    const validSpecialists: MapSpecialist[] = [
      {
        mapName: "Dust2",
        cleanMapName: "Dust2",
        player: {
          id: "p-travis",
          nickname: "TRAVIS SCOUTTT",
          avatarUrl: null,
          levelGc: 18,
        },
        rating: 1.52,
        wins: 10,
        matches: 15,
        winrate: 66.7,
        wilsonScore: 0.417,
        minMatches: 5,
        podium: [
          {
            player: { id: "p-travis", nickname: "TRAVIS SCOUTTT", avatarUrl: null, levelGc: 18 },
            rating: 1.52,
            wins: 10,
            matches: 15,
            winrate: 66.7,
            wilsonScore: 0.417,
          },
          {
            player: { id: "p-runner", nickname: "RunnerTwo", avatarUrl: null, levelGc: 16 },
            rating: 1.23,
            wins: 4,
            matches: 9,
            winrate: 44.4,
            wilsonScore: 0.188,
          },
        ],
      },
    ];

    const html = renderToString(
      React.createElement(ReisDosMapa, {
        specialists: validSpecialists,
        mapWinrates: [],
        bestMap: null,
        worstMap: null,
      })
    );

    expect(html).toContain("TRAVIS SCOUTTT");
    expect(html).toContain("67%");
    expect(html).toContain("10 vitórias em 15 partidas");
    expect(html).toContain("RunnerTwo");
    expect(html).toContain("44%");
    expect(html).toContain("4V em 9P");
  });

  it("não deve quebrar quando bestMap ou worstMap possuírem winrate indefinido", () => {
    const brokenMap: MapPerformanceEntry = {
      map: "de_vertigo",
      cleanMapName: "Vertigo",
      matchesPlayed: 0,
      wins: 0,
      winrate: undefined as any,
    };

    expect(() => {
      renderToString(
        React.createElement(ReisDosMapa, {
          specialists: [],
          mapWinrates: [brokenMap],
          bestMap: brokenMap,
          worstMap: brokenMap,
        })
      );
    }).not.toThrow();

    const html = renderToString(
      React.createElement(ReisDosMapa, {
        specialists: [],
        mapWinrates: [brokenMap],
        bestMap: brokenMap,
        worstMap: brokenMap,
      })
    );

    expect(html).toContain("Vertigo");
    expect(html).toContain("Sem dados");
  });
});
