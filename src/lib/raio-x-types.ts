/**
 * CS Zinda Criticância — Raio-X da Criticância
 * Tipos, contratos e arquitetura estatística completa para os 9 módulos táticos.
 */

export type RaioXCardId =
  | "ENTREGAMOS_5V4"
  | "TERROR_DOS_AMIGOS"
  | "ECONOMIA_DESASTRE"
  | "MELHOR_DUPLA_ZINDA"
  | "MATADOR_ECO"
  | "PLANTOU_GANHOU"
  | "ESPECIALISTA_ARMAS"
  | "REI_ROUNDS_DECISIVOS"
  | "PARCEIROS_VITORIA_DERROTA";

export interface RaioXCardMeta {
  id: RaioXCardId;
  index: number;
  title: string;
  tagline: string;
  status: "active" | "awaiting_telemetry";
  dataSource: string;
}

export interface PlayerRef {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

/**
 * Catálogo arquitetural dos 9 módulos do Raio-X da Criticância.
 */
export const RAIO_X_CARDS_CATALOG: RaioXCardMeta[] = [
  {
    id: "ENTREGAMOS_5V4",
    index: 1,
    title: "Entregamos o 5v4?",
    tagline: "Taxa de conversão e entrega após conseguir a First Kill do round.",
    status: "active",
    dataSource: "Demos GC (entryDuels + roundsJson)",
  },
  {
    id: "TERROR_DOS_AMIGOS",
    index: 2,
    title: "Terror dos Amigos",
    tagline: "Flashes aliados, dano amigo e incidentes com companheiros de equipe.",
    status: "active",
    dataSource: "Demos GC (damage + blind_events)",
  },
  {
    id: "ECONOMIA_DESASTRE",
    index: 3,
    title: "Economia do Desastre",
    tagline: "Aproveitamento em compras forçadas e eficiência de dinheiro da Zinda.",
    status: "active",
    dataSource: "Demos GC (economy + purchases + rounds)",
  },
  {
    id: "MELHOR_DUPLA_ZINDA",
    index: 4,
    title: "Melhor Dupla da Zinda",
    tagline: "Duplas com maior sinergia de trocas mútuas e tempo de re-frag.",
    status: "active",
    dataSource: "Demos GC (PlayerTradeEvent + PlayerMatchStats)",
  },
  {
    id: "MATADOR_ECO",
    index: 5,
    title: "Matador de Eco",
    tagline: "Abates e inflação de estatísticas contra adversários em rounds econômicos.",
    status: "active",
    dataSource: "Demos GC (kills analytics anti_eco)",
  },
  {
    id: "PLANTOU_GANHOU",
    index: 6,
    title: "Plantou, Ganhou?",
    tagline: "Aproveitamento pós-plant da C4: detonações convertidas vs defuses sofridos.",
    status: "active",
    dataSource: "Demos GC (roundsJson bomb_exploded/defused + MVP)",
  },
  {
    id: "ESPECIALISTA_ARMAS",
    index: 7,
    title: "Especialista em Armas",
    tagline: "Letalidade, precisão de headshot e dominância por categoria de armamento.",
    status: "active",
    dataSource: "Demos GC (PlayerMatchup.weapons + kills)",
  },
  {
    id: "REI_ROUNDS_DECISIVOS",
    index: 8,
    title: "Rei dos Rounds Decisivos",
    tagline: "Impacto no Round 12 (half), Round 24 (regulação) e Prorrogações (25+).",
    status: "active",
    dataSource: "Demos GC (roundsJson R12/R24/OT + entryDuels + clutches)",
  },
  {
    id: "PARCEIROS_VITORIA_DERROTA",
    index: 9,
    title: "Parceiros de Vitória e Derrota",
    tagline: "Com quem cada membro mais ganha, perde e converte no mesmo time.",
    status: "active",
    dataSource: "PlayerMatchStats (partidas comunitárias)",
  },
];

// ============================================================================
// CARD 1 — Entregamos o 5v4?
// ============================================================================

export interface Entregamos5v4Stats {
  totalEligibleRounds: number;
  totalAdvantagesCreated: number;
  roundsWonAfterFk: number;
  roundsLostAfterFk: number;
  conversionRate: number | null;
  surrenderRate: number | null;
  hasTelemetry: boolean;
  telemetryUnavailableReason: string | null;
}

// ============================================================================
// CARD 2 — Terror dos Amigos
// ============================================================================

export interface PlayerFriendlyFireIncident {
  player: PlayerRef;
  roundsPlayed: number;
  teamDamage: number;
  teamKills: number;
  teamFlashes: number;
  teamBlindDurationSeconds: number;
  incidentsPer100Rounds: number;
}

export interface TerrorDosAmigosStats {
  totalMatchesAnalyzed: number;
  totalRoundsAnalyzed: number;
  totalTeamDamage: number;
  totalTeamKills: number;
  totalTeamFlashes: number;
  topTeamFlasher: PlayerFriendlyFireIncident | null;
  topTeamDamager: PlayerFriendlyFireIncident | null;
  rankings: PlayerFriendlyFireIncident[];
  hasTelemetry: boolean;
  telemetryUnavailableReason: string | null;
}

// ============================================================================
// CARD 3 — Economia do Desastre
// ============================================================================

export interface EconomiaDesastreStats {
  totalRoundsAnalyzed: number;
  forceBuyRounds: number;
  forceBuyWins: number;
  forceBuyWinrate: number | null;
  fullEcoRounds: number;
  fullEcoWins: number;
  fullEcoWinrate: number | null;
  fullBuyRounds: number;
  fullBuyWins: number;
  fullBuyWinrate: number | null;
  estimatedEquipmentLostValue: number | null;
  hasTelemetry: boolean;
  telemetryUnavailableReason: string | null;
}

// ============================================================================
// CARD 4 — Melhor Dupla da Zinda (Sinergia de Trocas)
// ============================================================================

export interface DuoTradeSynergy {
  playerA: PlayerRef;
  playerB: PlayerRef;
  totalMutualTrades: number;
  tradesAAvengedB: number;
  tradesBAvengedA: number;
  avgRefragTimeSeconds: number;
  fastestRefragTimeSeconds: number;
  matchesTogether: number;
  winrateTogether: number;
}

export interface MelhorDuplaStats {
  minTradesThreshold: number;
  totalTrackedTrades: number;
  mostSynergicDuo: DuoTradeSynergy | null;
  fastestTradeDuo: DuoTradeSynergy | null;
  allEligibleDuos: DuoTradeSynergy[];
  hasTelemetry: boolean;
  telemetryUnavailableReason: string | null;
}

// ============================================================================
// CARD 5 — Matador de Eco
// ============================================================================

export interface PlayerEcoHunter {
  player: PlayerRef;
  ecoKills: number;
  totalKills: number;
  ecoKillPercentage: number;
  antiEcoRoundKillsPerRound: number;
}

export interface MatadorEcoStats {
  totalAnalyzedKills: number;
  totalEcoKills: number;
  topEcoHunter: PlayerEcoHunter | null;
  rankings: PlayerEcoHunter[];
  hasTelemetry: boolean;
  telemetryUnavailableReason: string | null;
}

// ============================================================================
// CARD 6 — Plantou, Ganhou?
// ============================================================================

export interface PlantouGanhouDefuser {
  player: PlayerRef;
  defuses: number;
}

export interface PlantouGanhouStats {
  totalEligibleRounds: number;
  totalPostPlants: number;
  bombsExploded: number;
  bombsDefused: number;
  postPlantConversionRate: number | null;
  retakeSuccessRate: number | null;
  topDefusers: PlantouGanhouDefuser[];
  hasTelemetry: boolean;
  telemetryUnavailableReason: string | null;
}

// ============================================================================
// CARD 7 — Especialista em Armas
// ============================================================================

export type WeaponCategory = "rifles" | "snipers" | "pistols" | "smgs" | "heavy" | "utility";

export interface WeaponStat {
  weaponKey: string;
  displayName: string;
  category: WeaponCategory;
  kills: number;
}

export interface CategorySpecialist {
  category: WeaponCategory;
  categoryLabel: string;
  leader: PlayerRef;
  weaponDisplayName: string;
  weaponKey: string;
  kills: number;
  totalPlayerKills: number;
  categoryShare: number;
}

export interface PlayerWeaponDominance {
  player: PlayerRef;
  totalKills: number;
  favoriteWeapon: WeaponStat;
  weapons: WeaponStat[];
}

export interface EspecialistaArmasStats {
  totalKillsAnalyzed: number;
  topRifler: CategorySpecialist | null;
  topSniper: CategorySpecialist | null;
  topPistoleiro: CategorySpecialist | null;
  topSmg: CategorySpecialist | null;
  playerProfiles: PlayerWeaponDominance[];
  hasTelemetry: boolean;
  telemetryUnavailableReason: string | null;
}

// ============================================================================
// CARD 8 — Rei dos Rounds Decisivos
// ============================================================================

export interface DecisivePlayerStat {
  player: PlayerRef;
  decisiveImpactScore: number;
  mvps: number;
  firstKills: number;
  clutchesWon: number;
  decisiveRoundsPlayed: number;
}

export interface ReiRoundsDecisivosStats {
  totalDecisiveRoundsAnalyzed: number;
  topDecisivePlayer: DecisivePlayerStat | null;
  topDecisiveMvp: DecisivePlayerStat | null;
  topDecisiveFirstKiller: DecisivePlayerStat | null;
  topDecisiveClutcher: DecisivePlayerStat | null;
  rankings: DecisivePlayerStat[];
  hasTelemetry: boolean;
  telemetryUnavailableReason: string | null;
}

// ============================================================================
// CARD 9 — Parceiros de Vitória e Derrota
// ============================================================================

export interface DuoPartnership {
  playerA: PlayerRef;
  playerB: PlayerRef;
  total: number;
  wins: number;
  losses: number;
  ties: number;
  winrate: number;
  lossRate: number;
  lastMatchPlayedAt: string | null;
}

export interface PlayerPartnerDetail {
  partner: PlayerRef;
  total: number;
  wins: number;
  losses: number;
  ties: number;
  winrate: number;
  lossRate: number;
  lastMatchPlayedAt: string | null;
}

export interface PlayerPartnershipsSummary {
  player: PlayerRef;
  totalPartnersCount: number;
  mostWins: PlayerPartnerDetail | null;
  mostLosses: PlayerPartnerDetail | null;
  bestWinrate: PlayerPartnerDetail | null;
  worstWinrate: PlayerPartnerDetail | null;
  allPartners: PlayerPartnerDetail[];
}

export interface PartnersRankings {
  minMatchesThreshold: number;
  totalEligibleDuos: number;
  mostWinsDuo: DuoPartnership | null;
  mostLossesDuo: DuoPartnership | null;
  bestWinrateDuo: DuoPartnership | null;
  worstWinrateDuo: DuoPartnership | null;
  allEligibleDuos: DuoPartnership[];
  playersMap: Record<string, PlayerPartnershipsSummary>;
  monitoredPlayers: PlayerRef[];
}

// ============================================================================
// BUNDLE COMPLETO DO RAIO-X COM OS 9 MÓDULOS
// ============================================================================

export interface RaioXBundle {
  entregamos5v4: Entregamos5v4Stats;
  terrorDosAmigos: TerrorDosAmigosStats;
  economiaDesastre: EconomiaDesastreStats;
  melhorDupla: MelhorDuplaStats;
  matadorEco: MatadorEcoStats;
  plantouGanhou: PlantouGanhouStats;
  especialistaArmas: EspecialistaArmasStats;
  reiRoundsDecisivos: ReiRoundsDecisivosStats;
  parceiros: PartnersRankings;
}
