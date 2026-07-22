import { describe, expect, it } from "vitest";
// Importamos a função de interesse
// @ts-ignore -- Precisamos ignorar o ts-ignore caso por algum motivo a compilação do teste se comporte diferente
import { getMapSpecialistsFromDataset } from "./competitive.service";

describe("getMapSpecialistsFromDataset", () => {
  it("eleger o jogador com melhor rating entre os elegíveis (dois jogadores diferentes no mesmo mapa)", () => {
    const dataset = {
      activePlayers: [
        { id: "playerA", nickname: "Jogador A", avatarUrl: null, levelGc: 14 },
        { id: "playerB", nickname: "Jogador B", avatarUrl: null, levelGc: 12 },
      ],
      statsByPlayer: new Map(),
      allStats: [
        // Jogador A jogou 3 partidas com média 1.10
        { playerId: "playerA", rating: 1.10, match: { map: { name: "Dust2" } } },
        { playerId: "playerA", rating: 1.10, match: { map: { name: "Dust2" } } },
        { playerId: "playerA", rating: 1.10, match: { map: { name: "Dust2" } } },
        
        // Jogador B jogou 4 partidas com média 1.30
        { playerId: "playerB", rating: 1.30, match: { map: { name: "Dust2" } } },
        { playerId: "playerB", rating: 1.30, match: { map: { name: "Dust2" } } },
        { playerId: "playerB", rating: 1.30, match: { map: { name: "Dust2" } } },
        { playerId: "playerB", rating: 1.30, match: { map: { name: "Dust2" } } },
      ],
    };

    dataset.statsByPlayer.set("playerA", dataset.allStats.filter(s => s.playerId === "playerA"));
    dataset.statsByPlayer.set("playerB", dataset.allStats.filter(s => s.playerId === "playerB"));

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);

    expect(specialists).toHaveLength(1);
    expect(specialists[0]).toMatchObject({
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
        // Jogador A jogou 5 partidas com média 1.20
        { playerId: "playerA", rating: 1.20, match: { map: { name: "Mirage" } } },
        { playerId: "playerA", rating: 1.20, match: { map: { name: "Mirage" } } },
        { playerId: "playerA", rating: 1.20, match: { map: { name: "Mirage" } } },
        { playerId: "playerA", rating: 1.20, match: { map: { name: "Mirage" } } },
        { playerId: "playerA", rating: 1.20, match: { map: { name: "Mirage" } } },
        
        // Jogador B jogou apenas 1 partida com rating 2.0 (Dominante, mas volume insuficiente)
        { playerId: "playerB", rating: 2.00, match: { map: { name: "Mirage" } } },
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
        // Mapa Nuke: Jogador A é o único elegível (3 partidas)
        { playerId: "playerA", rating: 1.40, match: { map: { name: "Nuke" } } },
        { playerId: "playerA", rating: 1.40, match: { map: { name: "Nuke" } } },
        { playerId: "playerA", rating: 1.40, match: { map: { name: "Nuke" } } },

        // Mapa Inferno: Jogador B é o único elegível (3 partidas)
        { playerId: "playerB", rating: 1.50, match: { map: { name: "Inferno" } } },
        { playerId: "playerB", rating: 1.50, match: { map: { name: "Inferno" } } },
        { playerId: "playerB", rating: 1.50, match: { map: { name: "Inferno" } } },
      ],
    };

    dataset.statsByPlayer.set("playerA", dataset.allStats.filter(s => s.playerId === "playerA"));
    dataset.statsByPlayer.set("playerB", dataset.allStats.filter(s => s.playerId === "playerB"));

    // @ts-ignore
    const specialists = getMapSpecialistsFromDataset(dataset);

    expect(specialists).toHaveLength(2);
    
    const nukeSpec = specialists.find(s => s.mapName === "Nuke");
    expect(nukeSpec).toBeDefined();
    expect(nukeSpec?.player.id).toBe("playerA");
    expect(nukeSpec?.rating).toBe(1.40);

    const infernoSpec = specialists.find(s => s.mapName === "Inferno");
    expect(infernoSpec).toBeDefined();
    expect(infernoSpec?.player.id).toBe("playerB");
    expect(infernoSpec?.rating).toBe(1.50);
  });
});
