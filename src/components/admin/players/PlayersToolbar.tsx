"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlayersToolbarProps {
  onAddClick: () => void;
}

export function PlayersToolbar({ onAddClick }: PlayersToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");

  // Debounced search param updates
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentQuery = searchParams.get("search") || "";
      if (searchValue === currentQuery) return; // avoid redundant navigation
      
      const params = new URLSearchParams(searchParams.toString());
      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
      } else {
        params.delete("search");
      }
      params.set("page", "1"); // reset to page 1 on new search
      
      router.push(`${pathname}?${params.toString()}`);
    }, 450);

    return () => clearTimeout(handler);
  }, [searchValue, pathname, router, searchParams]);

  // Keep state in sync with URL changes (e.g. if filters are cleared)
  useEffect(() => {
    setSearchValue(searchParams.get("search") || "");
  }, [searchParams]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
      {/* Search Input */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
        <input
          type="text"
          placeholder="Pesquisar por apelido, Steam ID, GC ID..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full h-9 pl-9 pr-4 rounded-xl border border-white/5 bg-white/[0.02] text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>

      {/* Action Button */}
      <Button
        onClick={onAddClick}
        className="w-full sm:w-auto h-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md active:translate-y-px"
      >
        <Plus className="size-4" />
        <span>Adicionar Jogador</span>
      </Button>
    </div>
  );
}
