import { Swords, Shield, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AchievementCard } from "./achievement-card";
import type { AchievementCatalogEntry, AchievementCategory } from "@/server/domain/achievementCatalog";

const CATEGORY_CONFIG: Record<AchievementCategory, { label: string; description: string; icon: LucideIcon }> = {
  combate: {
    label: "Combate",
    description: "Feitos individuais durante a partida — kills, headshots e performance geral.",
    icon: Swords,
  },
  clutch: {
    label: "Clutch",
    description: "Rondas vencidas em desvantagem numérica. Quanto maior o desafio, maior a glória.",
    icon: Shield,
  },
  carreira: {
    label: "Carreira",
    description: "Marcos acumulados ao longo da sua jornada competitiva no hub.",
    icon: TrendingUp,
  },
};

export function AchievementCategory({
  category,
  entries,
}: {
  category: AchievementCategory;
  entries: (AchievementCatalogEntry & { unlockCount: number })[];
}) {
  const { label, description, icon: Icon } = CATEGORY_CONFIG[category];

  return (
    <section>
      {/* Category header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
          <Icon className="size-4 text-muted-foreground/80" />
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-white/90">{label}</h2>
          <p className="text-[10px] text-muted-foreground/55 mt-0.5">{description}</p>
        </div>
        <span className="ml-auto text-[10px] font-semibold text-muted-foreground/40 tabular-nums">
          {entries.length}
        </span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {entries.map((entry) => (
          <AchievementCard key={entry.code} entry={entry} unlockCount={entry.unlockCount} />
        ))}
      </div>
    </section>
  );
}
