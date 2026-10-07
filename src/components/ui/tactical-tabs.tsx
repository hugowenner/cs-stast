"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number | string;
  badge?: string;
  disabled?: boolean;
}

export interface TacticalTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "underline" | "solid" | "deck";
  size?: "sm" | "md";
  className?: string;
}

export function TacticalTabs({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  size = "md",
  className,
}: TacticalTabsProps) {
  const prefersReduced = useReducedMotion();

  if (variant === "solid") {
    return (
      <div
        role="tablist"
        className={cn(
          "flex items-center gap-1 p-1 rounded-sm bg-surface-deck border border-border-subtle overflow-x-auto no-scrollbar",
          className,
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.id)}
              className={cn(
                "relative flex-1 inline-flex items-center justify-center gap-1.5 rounded-[2px] font-sans font-bold uppercase tracking-wider transition-micro select-none py-2 px-3 outline-none cursor-pointer focus-visible:ring-1 focus-visible:ring-primary",
                size === "sm" ? "text-[9px]" : "text-[10px]",
                isActive ? "text-white font-black" : "text-muted-foreground hover:text-white",
                tab.disabled && "opacity-40 cursor-not-allowed",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={prefersReduced ? undefined : "tactical-solid-tab-indicator"}
                  className="absolute inset-0 bg-surface-elevated rounded-[2px] border border-border-default shadow-sm -z-0"
                  transition={{ duration: prefersReduced ? 0.01 : 0.18, ease: "easeOut" }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {Icon && <Icon className="size-3.5 shrink-0" />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="font-data text-[9px] text-muted-foreground/70 ml-0.5">
                    ({tab.count})
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default: Underline / Deck tabs
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center border-b border-border-default overflow-x-auto no-scrollbar",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 font-sans font-bold uppercase tracking-wider transition-micro select-none py-3 px-4 outline-none cursor-pointer border-b-2 border-transparent focus-visible:text-primary",
              size === "sm" ? "text-[10px]" : "text-xs",
              isActive
                ? "text-white font-black"
                : "text-muted-foreground hover:text-white/80 hover:bg-white/[0.02]",
              tab.disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {Icon && <Icon className="size-3.5 shrink-0" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="font-data text-[9px] text-muted-foreground/60 ml-0.5">
                {tab.count}
              </span>
            )}

            {isActive && (
              <motion.div
                layoutId={prefersReduced ? undefined : "tactical-tab-underline"}
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary shadow-[0_0_8px_var(--primary)]"
                transition={{ duration: prefersReduced ? 0.01 : 0.2, ease: "easeOut" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
