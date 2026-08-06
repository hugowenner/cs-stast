import { Trophy } from "lucide-react";
import type { AchievementsPageStats } from "@/server/services/achievement.service";

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50 whitespace-nowrap">
        {label}
      </p>
      <p className="text-[13px] font-black text-white truncate leading-tight">{String(value)}</p>
    </div>
  );
}

export function AchievementHero({
  totalInCatalog,
  totalUnlocks,
  topCollector,
  rarestEntry,
}: Pick<AchievementsPageStats, "totalInCatalog" | "totalUnlocks" | "topCollector" | "rarestEntry">) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4 glass-panel rounded-2xl border border-white/[0.06]">
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-warning/12">
          <Trophy className="size-4 text-status-warning" />
        </div>
        <div>
          <h1 className="text-[13px] font-black text-white leading-tight">🏛️ Museu dos Amassos</h1>
          <p className="text-[9px] text-muted-foreground/50">Conquistas do grupo no CS2 Stats Hub</p>
        </div>
      </div>

      <div className="h-6 w-px bg-white/[0.06] hidden sm:block shrink-0" />

      <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        <Metric label="Catálogo" value={totalInCatalog} />
        <Metric label="Desbloqueadas" value={totalUnlocks === 0 ? "Nenhuma" : totalUnlocks} />
        <Metric label="Líder" value={topCollector?.player.nickname ?? "—"} />
        <Metric label="Mais Rara" value={rarestEntry?.name ?? "—"} />
      </div>
    </div>
  );
}
