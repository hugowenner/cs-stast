import { FadeIn } from "@/components/motion/fade-in";
import { safeQuery } from "@/server/safeQuery";
import * as achievementService from "@/server/services/achievement.service";
import { ACHIEVEMENT_CATALOG, ACHIEVEMENT_CATEGORY } from "@/server/domain/achievementCatalog";
import type { AchievementCategory } from "@/server/domain/achievementCatalog";
import { AchievementHero } from "@/components/achievements/achievement-hero";
import { AchievementCatalog } from "@/components/achievements/achievement-catalog";
import { AchievementFeed } from "@/components/achievements/achievement-feed";
import { SectionHeader } from "@/components/ui/section-header";

const CATEGORY_ORDER: AchievementCategory[] = ["combate", "clutch", "carreira"];

export const dynamic = "force-dynamic";

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
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full px-4 sm:px-6">
      {/* 01 / Header & Telemetria Geral */}
      <FadeIn>
        <AchievementHero
          totalInCatalog={stats.totalInCatalog}
          totalUnlocks={stats.totalUnlocks}
          topCollector={stats.topCollector}
          rarestEntry={stats.rarestEntry}
        />
      </FadeIn>

      {/* 02 / Catálogo com Accordions, Filtros e Busca */}
      <FadeIn delay={0.04}>
        <div className="flex flex-col gap-3">
          <SectionHeader
            index="02"
            tag="DISTINÇÕES TÁTICAS"
            title="CATÁLOGO OPERACIONAL"
            subtitle="Critérios de combate, domínio de clutches e marcos cumulativos de carreira."
          />
          <AchievementCatalog categories={categories} />
        </div>
      </FadeIn>

      {/* 03 / Feed de Auditoria e Desbloqueios Recentes */}
      <FadeIn delay={0.08}>
        <div className="flex flex-col gap-3">
          <SectionHeader
            index="03"
            tag="HISTÓRICO"
            title="ACHIEVEMENT LOG"
            subtitle="Registro cronológico de distinções conquistadas pelos atletas nas partidas disputadas."
          />
          <AchievementFeed unlocks={stats.recentUnlocks} />
        </div>
      </FadeIn>
    </div>
  );
}
