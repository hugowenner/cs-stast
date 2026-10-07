"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AchievementTierBadge } from "./achievement-tier-badge";
import { MapPin, ChevronDown, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecentUnlock } from "@/server/services/achievement.service";

function formatDayLabel(date: Date): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart.getTime() - dateStart.getTime()) / 86_400_000);
  if (diffDays === 0) return "HOJE";
  if (diffDays === 1) return "ONTEM";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    })
    .toUpperCase();
}

function groupByDay(unlocks: RecentUnlock[]): [string, RecentUnlock[]][] {
  const map = new Map<string, RecentUnlock[]>();
  for (const u of unlocks) {
    const label = formatDayLabel(new Date(u.earnedAt));
    const group = map.get(label);
    if (group) group.push(u);
    else map.set(label, [u]);
  }
  return [...map.entries()];
}

function FeedRow({ entry }: { entry: RecentUnlock }) {
  const mapName = entry.match?.map?.name;
  const timeFormatted = new Date(entry.earnedAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-elevated/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <PlayerAvatar
          nickname={entry.player.nickname}
          avatarUrl={entry.player.avatarUrl}
          size="sm"
        />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 text-xs font-mono">
          <Link
            href={`/players/${entry.player.id}`}
            className="font-bold text-foreground hover:text-primary transition-colors truncate max-w-[120px]"
          >
            {entry.player.nickname}
          </Link>
          <span className="text-[10px] text-muted-foreground/50">desbloqueou</span>
          <span className="font-bold text-foreground truncate">
            {entry.achievement.name}
          </span>
          {mapName && (
            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline-flex items-center gap-0.5">
              <MapPin className="size-2.5" />
              {mapName.replace(/^de_/i, "").toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-[10px] font-mono text-muted-foreground/40 tabular-nums hidden sm:inline">
          {timeFormatted}
        </span>
        <AchievementTierBadge tier={entry.achievement.tier} />
      </div>
    </div>
  );
}

export function AchievementFeed({ unlocks }: { unlocks: RecentUnlock[] }) {
  const [expanded, setExpanded] = useState(false);

  if (unlocks.length === 0) {
    return (
      <div className="surface-panel rounded-sm border border-border/40 p-8 text-center text-xs font-mono text-muted-foreground/50">
        Nenhuma conquista recente registrada no log.
      </div>
    );
  }

  const groups = groupByDay(unlocks);
  const firstGroupCount = groups[0]?.[1].length ?? 0;
  const hiddenCount = unlocks.length - firstGroupCount;

  const visibleGroups = expanded ? groups : groups.slice(0, 1);

  return (
    <div className="surface-panel rounded-sm border border-border/40 overflow-hidden">
      {visibleGroups.map(([dayLabel, entries]) => (
        <div key={dayLabel}>
          <div className="flex items-center justify-between border-b border-border/40 bg-surface-deck px-4 py-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-primary">
              {dayLabel}
            </span>
            <span className="text-[10px] font-mono tabular-nums text-muted-foreground/50">
              {entries.length} {entries.length === 1 ? "registro" : "registros"}
            </span>
          </div>
          <div className="divide-y divide-border/20">
            {entries.map((entry) => (
              <FeedRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}

      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full border-t border-border/30 bg-surface-deck/40 py-2.5 text-center text-xs font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-surface-elevated/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>Mostrar mais ({hiddenCount} registros)</span>
          <ChevronDown className="size-3.5" />
        </button>
      )}
    </div>
  );
}
