"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
}

export function Pagination({ currentPage, pageSize, totalCount }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  // Calculando índices
  const from = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between border-t border-white/5 pt-4 select-none">
      {/* Left: Summary text */}
      <span className="text-xs text-muted-foreground font-medium">
        Mostrando <span className="text-foreground font-semibold">{from}–{to}</span> de{" "}
        <span className="text-foreground font-semibold">{totalCount}</span> jogadores
      </span>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!hasPrev}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.01] text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          )}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </button>

        <span className="text-xs font-semibold text-foreground px-2">
          Pág. {currentPage} de {totalPages}
        </span>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!hasNext}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.01] text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          )}
          aria-label="Próxima página"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
