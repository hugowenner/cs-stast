"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeasonOption {
  id: string;
  name: string;
  status: "ACTIVE" | "CLOSED";
}

export function SeasonSelect({
  seasons,
  currentSeasonId,
}: {
  seasons: SeasonOption[];
  currentSeasonId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const activeSeason = seasons.find((s) => s.id === currentSeasonId) ?? seasons[0];

  const handleSelect = (seasonId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", seasonId);
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left z-20">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 text-xs font-bold transition-all duration-200 focus:outline-none"
      >
        <span>Temporada: {activeSeason?.name}</span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-black/90 p-1.5 shadow-2xl backdrop-blur-md z-40 focus:outline-none">
            <div className="py-1">
              {seasons.map((season) => {
                const isSelected = season.id === currentSeasonId;
                return (
                  <button
                    key={season.id}
                    onClick={() => handleSelect(season.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors duration-150",
                      isSelected
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <span>{season.name}</span>
                    {season.status === "ACTIVE" ? (
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded border border-status-warning/15">
                        Atual
                      </span>
                    ) : (
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-muted-foreground/60 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                        Fechada
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
