import { cn } from "@/lib/utils";

export interface FilterItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface FilterChipsProps {
  items: FilterItem[];
  activeId: string;
  onSelect: (id: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export function FilterChips({
  items,
  activeId,
  onSelect,
  size = "md",
  className,
}: FilterChipsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-sm bg-surface-deck border border-border-subtle overflow-x-auto no-scrollbar max-w-full",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            disabled={item.disabled}
            onClick={() => !item.disabled && onSelect(item.id)}
            className={cn(
              "btn-press inline-flex items-center gap-1.5 rounded-[2px] font-sans font-bold uppercase tracking-wider transition-micro select-none whitespace-nowrap cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary",
              size === "sm"
                ? "text-[9px] px-2 py-1"
                : "text-[10px] px-2.5 py-1.5",
              isActive
                ? "bg-primary text-primary-foreground font-black shadow-sm"
                : "text-muted-foreground hover:text-white hover:bg-white/[0.04]",
              item.disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {Icon && <Icon className={cn("shrink-0", size === "sm" ? "size-2.5" : "size-3")} />}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  "font-data text-[9px] px-1 py-0.2 rounded-[1px] font-extrabold ml-0.5",
                  isActive
                    ? "bg-black/20 text-white"
                    : "bg-white/[0.06] text-muted-foreground/70",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
