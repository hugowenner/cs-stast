import type { CompetitiveDataset } from "../competitive.service";
import type { DashboardHighlight, StoryCategory } from "./highlight.types";
import {
  ratingLeaderProvider,
  adrLeaderProvider,
  kdLeaderProvider,
  hsLeaderProvider,
  mostKillsProvider,
  mostAssistsProvider,
  bestKastProvider,
  bestImpactProvider,
  fewestDeathsProvider,
  mostConsistentProvider,
  mostAggressiveProvider,
  ratingEvolutionProvider,
  adrEvolutionProvider,
  mostStableProvider,
  mostVolatileProvider,
  recordKillsProvider,
  recordAdrProvider,
  recordRatingProvider,
  longestWinStreakProvider,
  mostDominantWinProvider,
  hotStreakProvider,
  coldStreakProvider,
  weeklyBestProvider,
  weeklyAdrProvider,
  bestDuoProvider,
  volumeDuoProvider,
  hotDuoProvider,
  mapProviders,
  bestMapAdrProvider,
  aceKingProvider,
  quadKingProvider,
  tripleKingProvider,
  clutchKingProvider,
  clutch1v2Provider,
} from "./highlight.providers";

// ─── Provider registry ────────────────────────────────────────────────────────

const ALL_PROVIDERS = [
  ratingLeaderProvider,
  adrLeaderProvider,
  kdLeaderProvider,
  hsLeaderProvider,
  mostKillsProvider,
  mostAssistsProvider,
  bestKastProvider,
  bestImpactProvider,
  fewestDeathsProvider,
  mostConsistentProvider,
  mostAggressiveProvider,
  ratingEvolutionProvider,
  adrEvolutionProvider,
  mostStableProvider,
  mostVolatileProvider,
  recordKillsProvider,
  recordAdrProvider,
  recordRatingProvider,
  longestWinStreakProvider,
  mostDominantWinProvider,
  hotStreakProvider,
  coldStreakProvider,
  weeklyBestProvider,
  weeklyAdrProvider,
  bestDuoProvider,
  volumeDuoProvider,
  hotDuoProvider,
  ...mapProviders,
  bestMapAdrProvider,
  aceKingProvider,
  quadKingProvider,
  tripleKingProvider,
  clutchKingProvider,
  clutch1v2Provider,
];

// ─── Quotas per storyCategory ─────────────────────────────────────────────────

const CATEGORY_QUOTAS: Record<StoryCategory, number> = {
  performance: 3,
  record: 2,
  map: 2,
  duo: 2,
  week: 2,
  multikill: 2,
  clutch: 2,
  evolution: 2,
  curiosity: 2,
  streak: 2,
};

const RARITY_ORDER: Record<string, number> = {
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

// Fisher-Yates in-place shuffle
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateHighlights(
  dataset: CompetitiveDataset,
  maxTotal = 12,
): DashboardHighlight[] {
  // 1. Run all providers
  const raw = ALL_PROVIDERS.flatMap((p) => {
    try {
      const result = p.generate(dataset);
      return result ? [result] : [];
    } catch {
      return [];
    }
  });

  // 2. Fisher-Yates shuffle (ensures different ordering each page load)
  shuffle(raw);

  // 3. Deduplicate
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const seenPlayerType = new Set<string>();
  const deduplicated: DashboardHighlight[] = [];

  for (const h of raw) {
    if (seenIds.has(h.id)) continue;
    if (seenTitles.has(h.title)) continue;
    const playerTypeKey = `${h.players.map((p) => p.id).sort().join("|")}::${h.type}`;
    if (seenPlayerType.has(playerTypeKey)) continue;

    seenIds.add(h.id);
    seenTitles.add(h.title);
    seenPlayerType.add(playerTypeKey);
    deduplicated.push(h);
  }

  // 4. Apply per-category quotas
  const categoryCounts = new Map<StoryCategory, number>();
  const withQuotas: DashboardHighlight[] = [];

  for (const h of deduplicated) {
    const cat = h.storyCategory;
    const count = categoryCounts.get(cat) ?? 0;
    const quota = CATEGORY_QUOTAS[cat] ?? 2;
    if (count >= quota) continue;
    categoryCounts.set(cat, count + 1);
    withQuotas.push(h);
  }

  // 5. Sort by rarity then priority
  withQuotas.sort((a, b) => {
    const rd = (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0);
    if (rd !== 0) return rd;
    return b.priority - a.priority;
  });

  return withQuotas.slice(0, maxTotal);
}
