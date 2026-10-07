"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronRight, Award, Flame, Zap, Shield, Trophy } from "lucide-react";
import type { AchievementCategory } from "@/server/domain/achievementCatalog";
import { AchievementCard } from "./achievement-card";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { cn } from "@/lib/utils";

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
  combate: "DISTINÇÕES DE COMBATE",
  clutch: "DISTINÇÕES DE CLUTCH & IMPACTO",
  carreira: "CONDECORAÇÕES DE CARREIRA",
};

const CATEGORY_ICONS: Record<AchievementCategory, React.ElementType> = {
  combate: Flame,
  clutch: Zap,
  carreira: Trophy,
};

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "TODAS" },
  { value: "combate", label: "COMBATE" },
  { value: "clutch", label: "CLUTCH" },
  { value: "carreira", label: "CARREIRA" },
  { value: "unlocked", label: "DESBLOQUEADAS" },
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
    <div className="flex flex-col gap-4">
      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
        {/* Chips de Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-xs text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-150 border whitespace-nowrap cursor-pointer",
                  isActive
                    ? "bg-surface-panel text-primary border-primary/50 shadow-sm"
                    : "bg-surface-deck text-muted-foreground/70 border-border/40 hover:text-foreground hover:border-border/80"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Input de Busca */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Buscar por distinção..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xs border border-border/60 bg-surface-deck pl-8 pr-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Accordion das Categorias */}
      {visible.length === 0 ? (
        <div className="surface-panel rounded-sm border border-border/40 p-12 text-center text-xs font-mono text-muted-foreground/50">
          Nenhuma distinção localizada com os filtros selecionados.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map(({ category, entries }) => {
            const isOpen = isSearching || openCategory === category;
            const CategoryIcon = CATEGORY_ICONS[category] ?? Award;

            return (
              <div
                key={category}
                className="surface-panel rounded-sm border border-border/40 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setOpenCategory(isOpen && !isSearching ? null : category)
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-elevated/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {isOpen ? (
                      <ChevronDown className="size-4 shrink-0 text-primary" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
                    )}
                    <CategoryIcon className="size-4 text-primary shrink-0" />
                    <span className="text-xs font-mono font-black uppercase tracking-wider text-foreground">
                      {CATEGORY_LABELS[category]}
                    </span>
                  </div>

                  <TacticalBadge variant="neutral" size="xs">
                    {entries.length} DISTINÇÕES
                  </TacticalBadge>
                </button>

                {isOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-border/30 p-4 bg-surface-deck/40">
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
