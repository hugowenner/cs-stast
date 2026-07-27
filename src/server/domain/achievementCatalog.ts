/**
 * Fonte de verdade do catálogo de conquistas — consumida pelo seed (prisma/seed.ts) e
 * pelo AchievementEngine (achievements.ts). Conquistas com critério definido pelo grupo
 * (ex: "Mochila", "Pato Oficial") ainda não entraram aqui — ver docs/FEATURES.md.
 */
export const ACHIEVEMENT_CODES = {
  // ─── Combate (por partida) ──────────────────────────────────────────────────
  ACE: "ACE",
  MULTI_KILL_3: "MULTI_KILL_3",
  MULTI_KILL_4: "MULTI_KILL_4",
  ENTRY_KING_MATCH: "ENTRY_KING_MATCH",
  HS_MACHINE_MATCH: "HS_MACHINE_MATCH",
  OPENING_DUELIST_MATCH: "OPENING_DUELIST_MATCH",
  TRADER_MATCH: "TRADER_MATCH",
  DAMAGE_DEALER_MATCH: "DAMAGE_DEALER_MATCH",
  SHARP_SHOOTER_MATCH: "SHARP_SHOOTER_MATCH",
  SURVIVOR_MATCH: "SURVIVOR_MATCH",
  SUPPORT_MATCH: "SUPPORT_MATCH",
  COLD_BLOOD_MATCH: "COLD_BLOOD_MATCH",
  MVP_MATCH: "MVP_MATCH",
  HIGH_IMPACT_MATCH: "HIGH_IMPACT_MATCH",
  // ─── Clutch (por partida) ──────────────────────────────────────────────────
  CLUTCH_1V1: "CLUTCH_1V1",
  CLUTCH_1V2: "CLUTCH_1V2",
  CLUTCH_1V3: "CLUTCH_1V3",
  CLUTCH_1V4: "CLUTCH_1V4",
  CLUTCH_1V5: "CLUTCH_1V5",
  WALL_MATCH: "WALL_MATCH",
  UNTOUCHABLE_MATCH: "UNTOUCHABLE_MATCH",
  CARRY_MATCH: "CARRY_MATCH",
  // ─── Carreira (cumulativas — únicas por jogador) ────────────────────────────
  MATCHES_10: "MATCHES_10",
  MATCHES_50: "MATCHES_50",
  MATCHES_100: "MATCHES_100",
  KILLS_250: "KILLS_250",
  KILLS_500: "KILLS_500",
  KILLS_1000: "KILLS_1000",
  HS_100: "HS_100",
  HS_500: "HS_500",
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

export type AchievementCategory = "combate" | "clutch" | "carreira";

// Mapeamento de categoria por código — frontend only, não existe no schema do banco.
// WALL_MATCH / UNTOUCHABLE_MATCH / CARRY_MATCH são performance geral, não clutch puro.
export const ACHIEVEMENT_CATEGORY: Record<AchievementCode, AchievementCategory> = {
  ACE: "combate",
  MULTI_KILL_3: "combate",
  MULTI_KILL_4: "combate",
  ENTRY_KING_MATCH: "combate",
  HS_MACHINE_MATCH: "combate",
  OPENING_DUELIST_MATCH: "combate",
  TRADER_MATCH: "combate",
  DAMAGE_DEALER_MATCH: "combate",
  SHARP_SHOOTER_MATCH: "combate",
  SURVIVOR_MATCH: "combate",
  SUPPORT_MATCH: "combate",
  COLD_BLOOD_MATCH: "combate",
  MVP_MATCH: "combate",
  HIGH_IMPACT_MATCH: "combate",
  WALL_MATCH: "combate",
  UNTOUCHABLE_MATCH: "combate",
  CARRY_MATCH: "combate",
  CLUTCH_1V1: "clutch",
  CLUTCH_1V2: "clutch",
  CLUTCH_1V3: "clutch",
  CLUTCH_1V4: "clutch",
  CLUTCH_1V5: "clutch",
  MATCHES_10: "carreira",
  MATCHES_50: "carreira",
  MATCHES_100: "carreira",
  KILLS_250: "carreira",
  KILLS_500: "carreira",
  KILLS_1000: "carreira",
  HS_100: "carreira",
  HS_500: "carreira",
  ENTRY_FRAGGER_CAREER: "carreira",
  CLUTCH_MASTER_CAREER: "carreira",
  TEAM_PLAYER_CAREER: "carreira",
  CONSISTENCY_CAREER: "carreira",
};

export const ACHIEVEMENT_CATALOG: AchievementCatalogEntry[] = [
  // ─── COMBATE ────────────────────────────────────────────────────────────────
  {
    code: ACHIEVEMENT_CODES.ACE,
    name: "Ace",
    description: "5 kills em um único round.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.MULTI_KILL_3,
    name: "Triple",
    description: "3 kills em um único round.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.MULTI_KILL_4,
    name: "Quad",
    description: "4 kills em um único round.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.ENTRY_KING_MATCH,
    name: "Abridor de Lata",
    description: "Maior número de entry kills da partida, com no mínimo 3.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.HS_MACHINE_MATCH,
    name: "One Tap",
    description: "Maior número de headshots da partida, com no mínimo 8.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.OPENING_DUELIST_MATCH,
    name: "Abre Alas",
    description: "3+ entry kills e mais aberturas vencidas do que perdidas.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.TRADER_MATCH,
    name: "Trocador Oficial",
    description: "3+ trade kills em uma única partida.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.DAMAGE_DEALER_MATCH,
    name: "Artilheiro",
    description: "ADR de 100 ou mais em uma partida.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.SHARP_SHOOTER_MATCH,
    name: "Mira Cirúrgica",
    description: "15+ headshots com taxa de precisão de 60% ou mais na partida.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.SURVIVOR_MATCH,
    name: "Barata",
    description: "Sobreviveu a pelo menos 70% dos rounds da partida.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.SUPPORT_MATCH,
    name: "Atirador de Flash",
    description: "8+ assistências em uma partida, mais assistências do que kills.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.COLD_BLOOD_MATCH,
    name: "Sangue Frio",
    description: "Venceu um clutch em uma partida perdida pelo time.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.MVP_MATCH,
    name: "Dono do Lobby",
    description: "Maior rating entre os jogadores monitorados da partida.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.HIGH_IMPACT_MATCH,
    name: "Modo Deus",
    description: "Impact de 2.0 ou mais em uma única partida.",
    tier: "gold",
  },
  // ─── CLUTCH ─────────────────────────────────────────────────────────────────
  {
    code: ACHIEVEMENT_CODES.CLUTCH_1V1,
    name: "1v1",
    description: "Venceu um round em desvantagem de 1 contra 1.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.CLUTCH_1V2,
    name: "1v2",
    description: "Venceu um round em desvantagem de 1 contra 2.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.CLUTCH_1V3,
    name: "1v3",
    description: "Venceu um round em desvantagem de 1 contra 3.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.CLUTCH_1V4,
    name: "1v4",
    description: "Venceu um round em desvantagem de 1 contra 4.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.CLUTCH_1V5,
    name: "Contra o Mundo",
    description: "Venceu um round em desvantagem de 1 contra 5.",
    tier: "legendary",
  },
  {
    code: ACHIEVEMENT_CODES.WALL_MATCH,
    name: "Imortal",
    description: "KAST de 90% ou mais em uma partida.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.UNTOUCHABLE_MATCH,
    name: "Fantasma",
    description: "Terminou a partida sem nenhuma morte, com 5+ kills.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.CARRY_MATCH,
    name: "No Colo",
    description: "Rating de 1.80 ou mais em uma única partida.",
    tier: "legendary",
  },
  // ─── CARREIRA ────────────────────────────────────────────────────────────────
  {
    code: ACHIEVEMENT_CODES.MATCHES_10,
    name: "Calouro",
    description: "Primeiros passos na competição — 10 partidas jogadas.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.MATCHES_50,
    name: "Veterano",
    description: "50 partidas registradas.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.MATCHES_100,
    name: "Centenário",
    description: "100 partidas registradas.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.KILLS_250,
    name: "Calibrando a Mira",
    description: "250 kills acumulados na carreira.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.KILLS_500,
    name: "Caçador",
    description: "500 kills acumulados na carreira.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.KILLS_1000,
    name: "Cemitério Particular",
    description: "1000 kills acumulados na carreira.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.HS_100,
    name: "Mira Aquecida",
    description: "100 headshots acumulados na carreira.",
    tier: "bronze",
  },
  {
    code: ACHIEVEMENT_CODES.HS_500,
    name: "Cirurgião",
    description: "500 headshots acumulados na carreira.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.ENTRY_FRAGGER_CAREER,
    name: "Desbravador",
    description: "250 entry kills acumulados na carreira.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.CLUTCH_MASTER_CAREER,
    name: "Nervos de Aço",
    description: "15 clutches vencidos (qualquer desvantagem) na carreira.",
    tier: "gold",
  },
  {
    code: ACHIEVEMENT_CODES.TEAM_PLAYER_CAREER,
    name: "Braço Direito",
    description: "500 assistências acumuladas na carreira.",
    tier: "silver",
  },
  {
    code: ACHIEVEMENT_CODES.CONSISTENCY_CAREER,
    name: "Relógio Suíço",
    description: "20+ partidas disputadas com rating médio de carreira acima de 1.05.",
    tier: "gold",
  },
];
