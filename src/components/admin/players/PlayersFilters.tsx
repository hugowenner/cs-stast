"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Ativos" },
  { id: "paused", label: "Pausados" },
  { id: "never_synced", label: "Nunca Sincronizados" },
  { id: "error", label: "Com Alertas" },
] as const;

export function PlayersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentFilter = searchParams.get("filter") || "all";

  const handleFilterClick = (filterId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filterId === "all") {
      params.delete("filter");
    } else {
      params.set("filter", filterId);
    }
    params.set("page", "1"); // Reset to page 1 on new filter
    
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1.5 border-b border-white/5 pb-1 select-none overflow-x-auto scrollbar-none">
      {FILTERS.map((filter) => {
        const isActive = currentFilter === filter.id;
        return (
          <button
            key={filter.id}
            onClick={() => handleFilterClick(filter.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer border border-transparent whitespace-nowrap",
              isActive
                ? "bg-primary/10 text-primary border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
