/**
 * Fonte de verdade do catálogo de conquistas — consumida pelo seed (prisma/seed.ts) e
 * pelo AchievementEngine (achievements.ts). Conquistas com critério definido pelo grupo
 * (ex: "Mochila", "Pato Oficial") ainda não entraram aqui — ver docs/FEATURES.md.
 */
export const ACHIEVEMENT_CODES = {
  ACE: "ACE",
  CLUTCH_1V1: "CLUTCH_1V1",
  CLUTCH_1V2: "CLUTCH_1V2",
  CLUTCH_1V3: "CLUTCH_1V3",
  CLUTCH_1V4: "CLUTCH_1V4",
  CLUTCH_1V5: "CLUTCH_1V5",
  FIVE_K: "FIVE_K",
  ENTRY_KING_MATCH: "ENTRY_KING_MATCH",
  HS_MACHINE_MATCH: "HS_MACHINE_MATCH",
  MATCHES_100: "MATCHES_100",
  HS_500: "HS_500",
  KILLS_1000: "KILLS_1000",
  // ─── Conquistas por partida (novas) ────────────────────────────────────
  MULTI_KILL_3: "MULTI_KILL_3",
  MULTI_KILL_4: "MULTI_KILL_4",
  OPENING_DUELIST_MATCH: "OPENING_DUELIST_MATCH",
  TRADER_MATCH: "TRADER_MATCH",
  DAMAGE_DEALER_MATCH: "DAMAGE_DEALER_MATCH",
  SHARP_SHOOTER_MATCH: "SHARP_SHOOTER_MATCH",
  SURVIVOR_MATCH: "SURVIVOR_MATCH",
  WALL_MATCH: "WALL_MATCH",
  CARRY_MATCH: "CARRY_MATCH",
  UNTOUCHABLE_MATCH: "UNTOUCHABLE_MATCH",
  SUPPORT_MATCH: "SUPPORT_MATCH",
  COLD_BLOOD_MATCH: "COLD_BLOOD_MATCH",
  // ─── Conquistas cumulativas (novas) ─────────────────────────────────────
  ENTRY_FRAGGER_CAREER: "ENTRY_FRAGGER_CAREER",
  CLUTCH_MASTER_CAREER: "CLUTCH_MASTER_CAREER",
  TEAM_PLAYER_CAREER: "TEAM_PLAYER_CAREER",
  CONSISTENCY_CAREER: "CONSISTENCY_CAREER",
} as const;

export type AchievementCode = (typeof ACHIEVEMENT_CODES)[keyof typeof ACHIEVEMENT_CODES];

export interface AchievementCatalogEntry {
  code: AchievementCode;
  name: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "legendary";
}

export const ACHIEVEMENT_CATALOG: AchievementCatalogEntry[] = [
  {
    code: ACHIEVEMENT_CODES.ACE,
    name: "Ace",
    description: "5 kills em um único round.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.CLUTCH_1V1,
    name: "Clutch 1v1",
    description: "Venceu um round em desvantagem de 1 contra 1.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.CLUTCH_1V2,
    name: "Clutch 1v2",
    description: "Venceu um round em desvantagem de 1 contra 2.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.CLUTCH_1V3,
    name: "Clutch 1v3",
    description: "Venceu um round em desvantagem de 1 contra 3.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.CLUTCH_1V4,
    name: "Clutch 1v4",
    description: "Venceu um round em desvantagem de 1 contra 4.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.CLUTCH_1V5,
    name: "Clutch 1v5",
    description: "Venceu um round em desvantagem de 1 contra 5.",
    tier: "legendary",
  },
  {
    code: ACHIEVEMENT_CODES.FIVE_K,
    name: "5K",
    description: "5 kills confirmados em uma única partida em sequência notável.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.ENTRY_KING_MATCH,
    name: "Entry King",
    description: "Mais entry kills da partida.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.HS_MACHINE_MATCH,
    name: "Headshot Machine",
    description: "Mais headshots da partida.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.MATCHES_100,
    name: "100 Partidas",
    description: "Disputou 100 partidas registradas.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.HS_500,
    name: "500 HS",
    description: "Acumulou 500 headshots.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.KILLS_1000,
    name: "1000 Kills",
    description: "Acumulou 1000 kills.",
    tier: "gold",
  },

  // ─── Conquistas por partida ────────────────────────────────────────────
  {
    code: ACHIEVEMENT_CODES.MULTI_KILL_3,
    name: "Multi Kill",
    description: "3 kills em um único round.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.MULTI_KILL_4,
    name: "Multi Kill Elite",
    description: "4 kills em um único round.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.OPENING_DUELIST_MATCH,
    name: "Opening Duelist",
    description: "3+ entry kills e mais aberturas vencidas do que perdidas na partida.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.TRADER_MATCH,
    name: "Trader",
    description: "3+ trade kills em uma única partida.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.DAMAGE_DEALER_MATCH,
    name: "Damage Dealer",
    description: "ADR de 100 ou mais em uma partida.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.SHARP_SHOOTER_MATCH,
    name: "Sharp Shooter",
    description: "15+ headshots com taxa de precisão de 60% ou mais na partida.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.SURVIVOR_MATCH,
    name: "Survivor",
    description: "Sobreviveu a pelo menos 70% dos rounds da partida.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.WALL_MATCH,
    name: "Wall",
    description: "KAST de 90% ou mais em uma partida.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.CARRY_MATCH,
    name: "Carry",
    description: "Rating de 1.80 ou mais em uma única partida.",
    tier: "legendary",
  },
  {
    code: ACHIEVEMENT_CODES.UNTOUCHABLE_MATCH,
    name: "Untouchable",
    description: "Terminou a partida sem nenhuma morte, com 5+ kills.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.SUPPORT_MATCH,
    name: "Support",
    description: "8+ assistências em uma partida, mais assistências do que kills.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.COLD_BLOOD_MATCH,
    name: "Cold Blood",
    description: "Venceu um clutch em uma partida perdida pelo time.",
    tier: "silver",
  },

  // ─── Conquistas cumulativas (carreira) ─────────────────────────────────
  {
    code: ACHIEVEMENT_CODES.ENTRY_FRAGGER_CAREER,
    name: "Entry Fragger",
    description: "Acumulou 250 entry kills na carreira.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.CLUTCH_MASTER_CAREER,
    name: "Clutch Master",
    description: "Venceu 15 clutches (qualquer desvantagem) na carreira.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.TEAM_PLAYER_CAREER,
    name: "Team Player",
    description: "Acumulou 500 assistências na carreira.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.CONSISTENCY_CAREER,
    name: "Consistência",
    description: "20+ partidas disputadas com rating médio de carreira acima de 1.05.",
    tier: "gold",
  },
];
