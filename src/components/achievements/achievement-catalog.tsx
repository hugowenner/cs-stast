"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import type { AchievementCategory } from "@/server/domain/achievementCatalog";
import { AchievementCard } from "./achievement-card";

type CatalogEntry = {
  code: string;
  name: string;
  description: string;
  tier: string;
  unlockCount: number;
};

type CategoryData = {
  category: AchievementCategory;
  entries: CatalogEntry[];
};

type FilterTab = "all" | AchievementCategory | "unlocked";

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  combate: "Combate",
  clutch: "Clutch",
  carreira: "Carreira",
};

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "combate", label: "Combate" },
  { value: "clutch", label: "Clutch" },
  { value: "carreira", label: "Carreira" },
  { value: "unlocked", label: "Desbloqueadas" },
];

export function AchievementCatalog({ categories }: { categories: CategoryData[] }) {
  const [openCategory, setOpenCategory] = useState<AchievementCategory | null>("combate");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLowerCase();
  const isSearching = !!normalizedSearch || filter !== "all";

  const visible = categories
    .filter((cat) => filter === "all" || filter === "unlocked" || cat.category === filter)
    .map((cat) => ({
      ...cat,
      entries: cat.entries.filter((e) => {
        if (filter === "unlocked" && e.unlockCount === 0) return false;
        if (normalizedSearch && !e.name.toLowerCase().includes(normalizedSearch)) return false;
        return true;
      }),
    }))
    .filter((cat) => cat.entries.length > 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Buscar conquista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-7 pr-3 py-1.5 text-[11px] text-white placeholder:text-muted-foreground/40 outline-none focus:border-white/[0.15] transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                filter === tab.value
                  ? "bg-white/[0.1] text-white"
                  : "text-muted-foreground/55 hover:text-white/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion */}
      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground/40">
          Nenhuma conquista encontrada.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map(({ category, entries }) => {
            const isOpen = isSearching || openCategory === category;
            return (
              <div
                key={category}
                className="glass-panel rounded-2xl border border-white/[0.06] overflow-hidden"
              >
                <button
                  onClick={() =>
                    setOpenCategory(isOpen && !isSearching ? null : category)
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/50" />
                  ) : (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                  )}
                  <span className="text-[11px] font-black uppercase tracking-[0.08em] text-white">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="text-[9px] text-muted-foreground/45 tabular-nums">
                    {entries.length} conquista{entries.length !== 1 ? "s" : ""}
                  </span>
                </button>

                {isOpen && (
                  <div className="grid grid-cols-3 gap-1.5 border-t border-white/[0.04] p-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                    {entries.map((entry) => (
                      <AchievementCard key={entry.code} entry={entry} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
