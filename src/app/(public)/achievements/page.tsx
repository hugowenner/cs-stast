import { FadeIn } from "@/components/motion/fade-in";
import { safeQuery } from "@/server/safeQuery";
import * as achievementService from "@/server/services/achievement.service";
import { ACHIEVEMENT_CATALOG, ACHIEVEMENT_CATEGORY } from "@/server/domain/achievementCatalog";
import type { AchievementCategory } from "@/server/domain/achievementCatalog";
import { AchievementHero } from "@/components/achievements/achievement-hero";
import { AchievementCatalog } from "@/components/achievements/achievement-catalog";
import { AchievementFeed } from "@/components/achievements/achievement-feed";

const CATEGORY_ORDER: AchievementCategory[] = ["combate", "clutch", "carreira"];

export default async function AchievementsPage() {
  const stats = await safeQuery(
    () => achievementService.getPageStats(),
    {
      totalInCatalog: ACHIEVEMENT_CATALOG.length,
      totalUnlocks: 0,
      topCollector: null,
      rarestEntry: null,
      unlockCountByCode: new Map<string, number>(),
      recentUnlocks: [],
    },
  );

  const categories = CATEGORY_ORDER.map((category) => ({
    category,
    entries: ACHIEVEMENT_CATALOG
      .filter((e) => ACHIEVEMENT_CATEGORY[e.code] === category)
      .map((e) => ({ ...e, unlockCount: stats.unlockCountByCode.get(e.code) ?? 0 })),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Hero compacto */}
      <FadeIn>
        <AchievementHero
          totalInCatalog={stats.totalInCatalog}
          totalUnlocks={stats.totalUnlocks}
          topCollector={stats.topCollector}
          rarestEntry={stats.rarestEntry}
        />
      </FadeIn>

      {/* Catálogo com accordion + filtros + busca */}
      <FadeIn delay={0.04}>
        <AchievementCatalog categories={categories} />
      </FadeIn>

      {/* Feed de desbloqueios recentes */}
      <FadeIn delay={0.08}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
              🔓 Conquistas Recentemente Arrancadas
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/45">
              Histórico de conquistas da comunidade — quem desbloqueou o quê.
            </p>
          </div>
          <AchievementFeed unlocks={stats.recentUnlocks} />
        </div>
      </FadeIn>
    </div>
  );
}
