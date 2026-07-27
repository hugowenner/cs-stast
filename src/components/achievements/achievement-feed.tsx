"use client";

import { useState } from "react";
import type { RecentUnlock } from "@/server/services/achievement.service";

const TIER_COLOR: Record<string, string> = {
  bronze: "text-[#c97a48]",
  silver: "text-slate-300",
  gold: "text-status-warning",
  legendary: "text-accent-violet",
};

const TIER_LABEL: Record<string, string> = {
  bronze: "Comum",
  silver: "Raro",
  gold: "Épico",
  legendary: "Lendário",
};

function formatDayLabel(date: Date): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart.getTime() - dateStart.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function groupByDay(unlocks: RecentUnlock[]): [string, RecentUnlock[]][] {
  const map = new Map<string, RecentUnlock[]>();
  for (const u of unlocks) {
    const label = formatDayLabel(u.earnedAt);
    const group = map.get(label);
    if (group) group.push(u);
    else map.set(label, [u]);
  }
  return [...map.entries()];
}

function FeedRow({ entry }: { entry: RecentUnlock }) {
  const color = TIER_COLOR[entry.achievement.tier] ?? "text-muted-foreground/50";
  const label = TIER_LABEL[entry.achievement.tier] ?? entry.achievement.tier;
  const mapName = entry.match?.map?.name;

  return (
    <div className="flex items-center gap-2 px-4 py-2 hover:bg-white/[0.015] transition-colors">
      <span className={`shrink-0 text-[9px] ${color}`}>▪</span>
      <span className="text-[11px] font-semibold text-white/80 shrink-0">{entry.player.nickname}</span>
      <span className="text-[9px] text-muted-foreground/45 shrink-0">desbloqueou</span>
      <span className={`text-[10px] font-bold truncate ${color}`}>{entry.achievement.name}</span>
      {mapName && (
        <span className="text-[9px] text-muted-foreground/35 shrink-0 hidden sm:inline">· {mapName}</span>
      )}
      <span className={`ml-auto shrink-0 text-[8px] font-bold uppercase tracking-wider ${color}`}>
        {label}
      </span>
    </div>
  );
}

export function AchievementFeed({ unlocks }: { unlocks: RecentUnlock[] }) {
  const [expanded, setExpanded] = useState(false);

  if (unlocks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground/50">
        Nenhuma conquista desbloqueada ainda.
      </p>
    );
  }

  const groups = groupByDay(unlocks);
  const firstGroupCount = groups[0]?.[1].length ?? 0;
  const hiddenCount = unlocks.length - firstGroupCount;

  const visibleGroups = expanded ? groups : groups.slice(0, 1);

  return (
    <div className="glass-panel overflow-hidden rounded-2xl border border-white/[0.06]">
      {visibleGroups.map(([dayLabel, entries]) => (
        <div key={dayLabel}>
          <div className="flex items-center gap-2.5 border-b border-white/[0.04] bg-white/[0.015] px-4 py-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
              {dayLabel}
            </span>
            <span className="text-[9px] tabular-nums text-muted-foreground/35">{entries.length}</span>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {entries.map((entry) => (
              <FeedRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}

      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full border-t border-white/[0.04] py-2.5 text-center text-[10px] font-medium text-muted-foreground/50 transition-colors hover:text-white/70"
        >
          Mostrar mais ({hiddenCount} conquista{hiddenCount !== 1 ? "s" : ""})
        </button>
      )}
    </div>
  );
}
