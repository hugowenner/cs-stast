"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RaioXCardFrameProps {
  moduleNumber: string; // e.g. "#01"
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  categoryBadge?: React.ReactNode;
  statusBadge?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function RaioXCardFrame({
  moduleNumber,
  title,
  description,
  icon: Icon,
  iconClass = "bg-primary/10 text-primary border-primary/20",
  categoryBadge,
  statusBadge,
  headerAction,
  footer,
  children,
  className,
}: RaioXCardFrameProps) {
  return (
    <div
      className={cn(
        "bg-surface-panel rounded-sm border border-border/60 hover:border-border/90 shadow-sm relative overflow-hidden flex flex-col justify-between gap-3.5 p-4 sm:p-5 group transition-all duration-200",
        className,
      )}
    >
      {/* Top indicator micro-line on hover (padrão StatTile e DataPanel do dashboard) */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/50 transition-micro" />

      {/* Header Padronizado */}
      <div className="flex flex-col gap-2 border-b border-border/30 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-xs border shrink-0 transition-micro",
                iconClass,
              )}
            >
              <Icon className="size-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70">
                  {moduleNumber}
                </span>
                {categoryBadge}
                {statusBadge}
              </div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-tight truncate mt-0.5">
                {title}
              </h3>
            </div>
          </div>

          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>

        <p className="text-[11px] font-mono text-muted-foreground/75 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Conteúdo Principal do Módulo */}
      <div className="flex-1 flex flex-col justify-between gap-3">
        {children}
      </div>

      {/* Footer Metodológico Padronizado */}
      {footer && (
        <div className="border-t border-border/20 pt-2.5 text-[10px] font-mono text-muted-foreground/50">
          {footer}
        </div>
      )}
    </div>
  );
}
