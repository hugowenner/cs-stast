/**
 * Head-to-head entre pares de jogadores. Opera sobre os dados de uma partida já em
 * memória (times + kills), sem acesso a banco — o Service decide o que fazer com o
 * resultado. playerAId é sempre o menor id (ordenação lexicográfica), convenção que
 * evita duas linhas para o mesmo par invertido.
 */
export interface RivalryMatchPlayer {
  playerId: string;
  team: "A" | "B";
}

export interface RivalryKillEvent {
  killerId: string;
  victimId: string;
}

export interface RivalryDelta {
  playerAId: string;
  playerBId: string;
  killsAOnB: number;
  killsBOnA: number;
  matchesTogether: number;
  matchesAgainst: number;
}

export function calculateRivalryDeltas(
  players: RivalryMatchPlayer[],
  kills: RivalryKillEvent[],
): RivalryDelta[] {
  const deltas = new Map<string, RivalryDelta>();

  const getOrInit = (idA: string, idB: string): RivalryDelta => {
    const [lo, hi] = idA < idB ? [idA, idB] : [idB, idA];
    const key = `${lo}:${hi}`;
    let delta = deltas.get(key);
    if (!delta) {
      delta = {
        playerAId: lo,
        playerBId: hi,
        killsAOnB: 0,
        killsBOnA: 0,
        matchesTogether: 0,
        matchesAgainst: 0,
      };
      deltas.set(key, delta);
    }
    return delta;
  };

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];
      if (p1.playerId === p2.playerId) continue;
      const delta = getOrInit(p1.playerId, p2.playerId);
      if (p1.team === p2.team) delta.matchesTogether += 1;
      else delta.matchesAgainst += 1;
    }
  }

  for (const kill of kills) {
    if (kill.killerId === kill.victimId) continue;
    const delta = getOrInit(kill.killerId, kill.victimId);
    if (delta.playerAId === kill.killerId) delta.killsAOnB += 1;
    else delta.killsBOnA += 1;
  }

  return Array.from(deltas.values());
}
