export type BalanceMetric = "LEVEL" | "RATING" | "ADR" | "KD" | "COMPOUND";

export interface PlayerData {
  id?: string;          // Opcional, pois convidados não possuem ID de trackedPlayer
  name: string;         // Nickname do jogador
  levelGc: number;      // 1-21
  rating: number;       // Rating da temporada (ou fallback de carreira)
  adr: number;          // ADR da temporada
  kd: number;           // K/D da temporada
  winrate: number;      // Winrate da temporada
  avatarUrl?: string | null;
  role?: string;        // Arquétipo/Função competitiva (ex: Entry Fragger)
  guest?: boolean;      // Indica se é um convidado manual
}

export interface BalancedTeamResult {
  ct: PlayerData[];
  tr: PlayerData[];
  ctSum: number;
  trSum: number;
  diff: number;
  total: number;
}

export type GameMode = "RANDOM" | "BALANCED";

export interface TeamBalanceMatchData {
  id: string;
  seed: string;
  mode: GameMode;
  metric: BalanceMetric;
  difference: number;
  winner?: string | null;
  createdAt: string;
  players: {
    id: string;
    nickname: string;
    avatar?: string | null;
    team: "CT" | "TR";
    weight: number;
    guest: boolean;
    trackedPlayerId?: string | null;
  }[];
}
