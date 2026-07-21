import { describe, expect, it } from "vitest";
import { normalizeGamersClubMatch } from "@/server/adapters/gamersclub/normalize";
import { syncMatchSchema } from "@/server/dtos/sync.dto";
import matchStandard from "@/server/adapters/gamersclub/fixtures/match-standard.json";
import matchPartial from "@/server/adapters/gamersclub/fixtures/match-partial.json";
import matchReal from "@/server/adapters/gamersclub/fixtures/match-real-27483022.json";

/**
 * Testes de contrato: fixam o comportamento do normalizador contra exemplos de payload
 * da Gamers Club. `match-standard.json`/`match-partial.json` ainda são placeholders de
 * melhor esforço (ver `_note` em cada um). `match-real-27483022.json` é uma captura
 * REAL de `{url-da-partida}/1` (2026-07-20) — é o teste que mais importa: pegou 34
 * erros de validação na primeira tentativa (campos numéricos vindo como string da GC,
 * `avatarUrl` sendo path relativo em vez de URL completa), corrigidos em `normalize.ts`.
 */
describe("normalizeGamersClubMatch", () => {
  it("mapeia um payload completo para o formato interno", () => {
    const result = normalizeGamersClubMatch(matchStandard);

    expect(result.matchId).toBe("27451220");
    expect(result.map).toBe("Inferno");
    expect(result.scoreTeamA).toBe(13);
    expect(result.scoreTeamB).toBe(9);
    expect(result.players).toHaveLength(3);

    const satisfa = result.players.find((p) => p.nickname === "sAtisfa");
    expect(satisfa).toMatchObject({
      steamId: "76561198000000001",
      gamersClubId: "481336",
      team: "A",
      kills: 24,
      deaths: 15,
      assists: 4,
      headshots: 12,
      adr: 88.4,
      kast: 74.0,
      entryKills: 3,
    });

    const rivalzin = result.players.find((p) => p.nickname === "rivalzin");
    expect(rivalzin?.team).toBe("B");
  });

  it("produz um resultado que passa na validação Zod de POST /api/sync/match", () => {
    const result = normalizeGamersClubMatch(matchStandard);
    expect(() => syncMatchSchema.parse(result)).not.toThrow();
  });

  it("degrada graciosamente quando campos faltam ou usam nomes alternativos", () => {
    const result = normalizeGamersClubMatch(matchPartial);

    expect(result.matchId).toBe("99999");
    expect(result.map).toBe("Nuke");
    expect(result.players).toHaveLength(1);

    const player = result.players[0];
    expect(player.nickname).toBe("semSteamId");
    // sem plSteamID64/plSteamID, cai para um steamId sintético baseado no id da GC
    expect(player.steamId).toBe("gc_555");
    expect(player.kills).toBe(10); // "kills" em vez de "nb_kill"
    expect(player.deaths).toBe(12); // "deaths" em vez de "death"
  });

  it("nunca lança, mesmo com payload vazio", () => {
    expect(() => normalizeGamersClubMatch({})).not.toThrow();
    const result = normalizeGamersClubMatch({});
    expect(result.players).toHaveLength(0);
  });

  it("normaliza uma partida real da Gamers Club (captura 2026-07-20, partida 27483022)", () => {
    const result = normalizeGamersClubMatch(matchReal);

    expect(result.matchId).toBe("27483022");
    // "map_name": "de_overpass" na GC → aliased para o nome de exibição do catálogo.
    expect(result.map).toBe("Overpass");
    // "data": "20/07/2026 19:22" (DD/MM/YYYY) — não a data de hoje.
    expect(result.playedAt.toISOString()).toBe("2026-07-20T19:22:00.000Z");
    expect(result.scoreTeamA).toBe(4);
    expect(result.scoreTeamB).toBe(13);
    expect(result.players).toHaveLength(4);

    const costa = result.players.find((p) => p.nickname === "Costa");
    expect(costa).toMatchObject({
      steamId: "76561198806269620",
      gamersClubId: "757573",
      team: "A",
      kills: 16, // vem como "16" (string) no payload real
      deaths: 13,
      assists: 4,
      headshots: 6,
      adr: 114.06,
      kast: 65,
      entryKills: 1,
    });
    // player.avatar é path relativo ("players/avatar/757573/757573"), não URL — omitido.
    expect(costa?.avatarUrl).toBeUndefined();
  });

  it("produz um resultado real que passa na validação Zod de POST /api/sync/match", () => {
    const result = normalizeGamersClubMatch(matchReal);
    expect(() => syncMatchSchema.parse(result)).not.toThrow();
  });

  it("aplica o alias de nome de mapa (de_x → nome de exibição) e deixa nomes desconhecidos passarem", () => {
    expect(normalizeGamersClubMatch({ jogos: { map_name: "de_dust2" } }).map).toBe("Dust2");
    expect(normalizeGamersClubMatch({ jogos: { map_name: "DE_MIRAGE" } }).map).toBe("Mirage");
    expect(normalizeGamersClubMatch({ jogos: { map_name: "de_algumMapaNovo" } }).map).toBe(
      "de_algumMapaNovo",
    );
  });
});
