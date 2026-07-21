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
];
