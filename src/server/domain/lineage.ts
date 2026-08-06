export enum DataSource {
  GAMERS_CLUB = "GAMERS_CLUB",
  DEMO_PARSER = "DEMO_PARSER",
  CALCULATED  = "CALCULATED"
}

export const STATS_FIELD_OWNERS = {
  // Gamers Club exclusive
  gcRating: DataSource.GAMERS_CLUB,
  levelGc: DataSource.GAMERS_CLUB,

  // Calculated fields (internal engines)
  eloBefore: DataSource.CALCULATED,
  eloAfter: DataSource.CALCULATED,
  rating: DataSource.CALCULATED,
  impact: DataSource.CALCULATED,

  // Event based (Demo Parser is owner, GC is fallback during initial sync)
  kills: DataSource.DEMO_PARSER,
  deaths: DataSource.DEMO_PARSER,
  assists: DataSource.DEMO_PARSER,
  headshots: DataSource.DEMO_PARSER,
  adr: DataSource.DEMO_PARSER,
  kast: DataSource.DEMO_PARSER,
  damage: DataSource.DEMO_PARSER,
  doubleKills: DataSource.DEMO_PARSER,
  tripleKills: DataSource.DEMO_PARSER,
  quadKills: DataSource.DEMO_PARSER,
  aces: DataSource.DEMO_PARSER,
  entryKills: DataSource.DEMO_PARSER,
  entryDeaths: DataSource.DEMO_PARSER,
  tradeKills: DataSource.DEMO_PARSER,
  clutchesWon: DataSource.DEMO_PARSER,
  flashAssists: DataSource.DEMO_PARSER,

  clutch1v1Attempts: DataSource.DEMO_PARSER,
  clutch1v1Wins: DataSource.DEMO_PARSER,
  clutch1v2Attempts: DataSource.DEMO_PARSER,
  clutch1v2Wins: DataSource.DEMO_PARSER,
  clutch1v3Attempts: DataSource.DEMO_PARSER,
  clutch1v3Wins: DataSource.DEMO_PARSER,
  clutch1v4Attempts: DataSource.DEMO_PARSER,
  clutch1v4Wins: DataSource.DEMO_PARSER,
  clutch1v5Attempts: DataSource.DEMO_PARSER,
  clutch1v5Wins: DataSource.DEMO_PARSER,
} as const;

export type StatsField = keyof typeof STATS_FIELD_OWNERS;
