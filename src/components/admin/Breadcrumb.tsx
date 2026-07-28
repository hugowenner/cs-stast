"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

const PATH_MAP: Record<string, string> = {
  admin: "Painel Admin",
  dashboard: "Visão Geral",
  players: "Jogadores",
  sync: "Sincronizações",
  database: "Banco de Dados",
  logs: "Logs do Sistema",
  tools: "Ferramentas",
  settings: "Configurações",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none">
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="size-3.5" />
      </Link>

      {segments.map((segment, index) => {
        // Skip rendering "admin" if it's the only segment or if it's the first
        if (segment === "admin" && index === 0) return null;
        
        const path = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const translatedLabel = PATH_MAP[segment] || segment;

        return (
          <div key={path} className="flex items-center gap-1.5">
            <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
            {isLast ? (
              <span className="text-foreground font-semibold truncate max-w-[120px] sm:max-w-none">
                {translatedLabel}
              </span>
            ) : (
              <Link
                href={path}
                className="hover:text-foreground transition-colors truncate max-w-[100px]"
              >
                {translatedLabel}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
