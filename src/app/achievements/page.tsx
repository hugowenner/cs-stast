import { Trophy } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { FadeIn } from "@/components/motion/fade-in";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { safeQuery } from "@/server/safeQuery";
import * as achievementService from "@/server/services/achievement.service";
import { cn } from "@/lib/utils";

const TIER_STYLE: Record<string, string> = {
  bronze: "text-[#d95926] bg-[#d95926]/15",
  silver: "text-muted-foreground bg-white/10",
  gold: "text-status-warning bg-status-warning/15",
  legendary: "text-accent-violet bg-accent-violet/15",
};

export default async function AchievementsPage() {
  const [catalog, recent] = await Promise.all([
    safeQuery(() => achievementService.listCatalog(), []),
    safeQuery(() => achievementService.listRecent(20), []),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <FadeIn>
        <h1 className="text-2xl font-bold tracking-tight">Conquistas</h1>
      </FadeIn>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FadeIn delay={0.05}>
          <SectionCard title="Catálogo">
            {catalog.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Catálogo ainda não semeado — rode <code>npm run db:seed</code>.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {catalog.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2"
                  >
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        TIER_STYLE[achievement.tier] ?? "text-foreground bg-white/10",
                      )}
                    >
                      <Trophy className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{achievement.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </FadeIn>

        <FadeIn delay={0.1}>
          <SectionCard title="Desbloqueadas recentemente">
            {recent.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Nenhuma conquista ainda.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {recent.map((entry) => (
                  <AchievementFeedItem key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </SectionCard>
        </FadeIn>
      </div>
    </div>
  );
}
