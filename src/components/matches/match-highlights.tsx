import Link from "next/link";
import { Trophy, Target, Skull, Percent, Crosshair, HelpCircle, UserCheck } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { cn } from "@/lib/utils";
import type { HighlightDTO } from "@/server/dtos/matchDetails.dto";

export function MatchHighlights({ highlights }: { highlights: HighlightDTO[] }) {
  if (highlights.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "mvp":
        return UserCheck;
      case "rating":
        return Trophy;
      case "adr":
        return Target;
      case "hs":
        return Skull;
      case "kills":
        return Crosshair;
      case "assists":
        return HelpCircle;
      case "kast":
        return Percent;
      default:
        return HelpCircle;
    }
  };

  const getAccentClass = (type: string) => {
    switch (type) {
      case "mvp":
        return "bg-accent-gold/10 text-accent-gold border-accent-gold/30";
      case "rating":
        return "bg-primary/10 text-primary border-primary/30";
      case "adr":
        return "text-foreground bg-surface-deck border-border/60";
      case "hs":
        return "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30";
      case "kills":
        return "bg-status-good/10 text-status-good border-status-good/30";
      default:
        return "bg-surface-deck text-muted-foreground border-border/40";
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {highlights.map((highlight) => {
        const Icon = getIcon(highlight.type);
        const accentClass = getAccentClass(highlight.type);

        return (
          <div
            key={highlight.type}
            className="surface-panel rounded-sm flex items-center justify-between p-4 border border-border/40"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-bold text-muted-foreground/70 uppercase tracking-wider block">
                {highlight.label}
              </span>
              <p className="text-xl font-mono font-black mt-0.5 text-foreground tracking-tight tabular-nums">
                {highlight.value}
              </p>

              <Link
                href={`/players/${highlight.player.id}`}
                className="flex items-center gap-2 mt-2 group w-max"
              >
                <PlayerAvatar
                  nickname={highlight.player.nickname}
                  avatarUrl={highlight.player.avatarUrl}
                  size="sm"
                />
                <span
                  className={cn(
                    "text-xs truncate font-bold group-hover:text-primary transition-colors",
                    highlight.player.isTracked ? "text-primary" : "text-muted-foreground/80"
                  )}
                >
                  {highlight.player.nickname}
                </span>
              </Link>
            </div>

            <div className={cn("flex size-9 items-center justify-center rounded-xs border ml-3 shrink-0", accentClass)}>
              <Icon className="size-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
