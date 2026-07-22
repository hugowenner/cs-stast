/**
 * Formato bruto do payload retornado por `GET {url-da-partida}/1` na Gamers Club.
 *
 * Verificado contra uma resposta real capturada em 2026-07-20 (partida 27483022, ver
 * fixtures/match-real-27483022.json). Achado principal: a GC devolve praticamente todo
 * campo numérico como STRING (`"nb_kill": "16"`), por isso os tipos abaixo aceitam
 * `number | string` — `normalize.ts` usa `toNumber()` para converter. Todos os campos
 * continuam opcionais de propósito: `normalize.ts` deve degradar graciosamente, nunca
 * lançar, se um campo não vier do jeito esperado.
 */

export interface GamersClubPlayerProfile {
  id?: number | string;
  plSteamID64?: string;
  plSteamID?: string;
  nick?: string;
  nickname?: string;
  /** Path relativo (`players/avatar/{id}/{id}`), não URL completa — ver toAbsoluteUrl em normalize.ts. */
  avatar?: string;
  level?: number | string;
  banned?: boolean;
}

export interface GamersClubPlayerMatchEntry {
  player?: GamersClubPlayerProfile;
  nb_kill?: number | string;
  kills?: number | string;
  death?: number | string;
  deaths?: number | string;
  assist?: number | string;
  assists?: number | string;
  adr?: number | string;
  kdr?: number | string;
  kast?: number | string;
  pkast?: number | string;
  hit_headshots?: number | string;
  headshots?: number | string;
  phs?: number | string;
  rounds_played?: number | string;
  flash_assist?: number | string;
  multikills?: number | string;
  firstkill?: number | string;
  rating_points?: number | string;
  damage?: number | string;
  clutch_won?: number | string;
  tk?: number | string;
  trade?: number | string;
  banido?: boolean;
}

export interface GamersClubRound {
  position?: number;
  scoreTeamA?: number;
  scoreTeamB?: number;
  winnerTeam?: string;
  winnerMode?: string;
  aliveA?: number;
  aliveB?: number;
  finishedAt?: string;
}

export interface GamersClubJogos {
  score_a?: number | string;
  score_b?: number | string;
  map_name?: string;
  map?: string;
  demo?: string;
  players?: {
    team_a?: GamersClubPlayerMatchEntry[];
    team_b?: GamersClubPlayerMatchEntry[];
  };
  /** Timeline de rounds — aninhado dentro de `jogos`, não no nível raiz do payload. */
  rounds?: GamersClubRound[];
}

export interface GamersClubMatchPayload {
  id?: number | string;
  matchId?: number | string;
  status?: string;
  /** Formato "DD/MM/YYYY HH:mm" (não ISO) — ver parseDate em normalize.ts. */
  data?: string;
  date?: string;
  jogos?: GamersClubJogos;
}
