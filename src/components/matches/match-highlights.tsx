import Link from "next/link";
import { Trophy, Target, Skull, Percent, Crosshair, HelpCircle, UserCheck } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
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
        return "bg-status-good/10 text-status-good border-status-good/20";
      case "rating":
        return "bg-accent-violet/10 text-accent-violet border-accent-violet/20";
      case "adr":
        return "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20";
      case "hs":
        return "bg-status-critical/10 text-status-critical border-status-critical/20";
      case "kills":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-white/5 text-muted-foreground border-white/10";
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {highlights.map((highlight) => {
        const Icon = getIcon(highlight.type);
        const accentClass = getAccentClass(highlight.type);

        return (
          <div
            key={highlight.type}
            className="glass-panel flex items-center justify-between p-4 border border-white/5 bg-white/[0.01]"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {highlight.label}
              </span>
              <p className="text-xl font-extrabold mt-1 text-white tracking-tight">
                {highlight.value}
              </p>
              
              <Link
                href={`/players/${highlight.player.id}`}
                className="flex items-center gap-2 mt-2.5 group w-max"
              >
                <PlayerAvatar
                  nickname={highlight.player.nickname}
                  avatarUrl={highlight.player.avatarUrl}
                  size="sm"
                />
                <span className={`text-xs truncate font-medium group-hover:text-primary transition-colors ${highlight.player.isTracked ? "text-accent-cyan font-semibold" : "text-muted-foreground"}`}>
                  {highlight.player.nickname}
                </span>
              </Link>
            </div>
            
            <div className={`flex size-10 items-center justify-center rounded-xl ${accentClass} ml-3 shrink-0`}>
              <Icon className="size-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
