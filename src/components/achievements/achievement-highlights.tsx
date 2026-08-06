import { Crown, Gem, Clock, Flame } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AchievementTierBadge } from "./achievement-tier-badge";
import type { AchievementsPageStats } from "@/server/services/achievement.service";

function HighlightCard({
  icon: Icon,
  label,
  iconClassName,
  children,
}: {
  icon: React.ElementType;
  label: string;
  iconClassName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel flex flex-col gap-3 rounded-2xl border border-white/[0.06] p-4">
      <div className="flex items-center gap-2">
        <Icon className={`size-3.5 shrink-0 ${iconClassName}`} />
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/55">
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

export function AchievementHighlights({
  topCollector,
  rarestEntry,
  recentUnlocks,
}: Pick<AchievementsPageStats, "topCollector" | "rarestEntry" | "recentUnlocks">) {
  const lastUnlock = recentUnlocks[0] ?? null;

  // Jogador mais ativo: quem aparece mais nos últimos 40 desbloqueios
  const activityCount = new Map<string, { nickname: string; avatarUrl: string | null; count: number }>();
  for (const unlock of recentUnlocks) {
    const key = unlock.playerId;
    const existing = activityCount.get(key);
    if (existing) {
      existing.count++;
    } else {
      activityCount.set(key, {
        nickname: unlock.player.nickname,
        avatarUrl: unlock.player.avatarUrl,
        count: 1,
      });
    }
  }
  const mostActive = [...activityCount.values()].sort((a, b) => b.count - a.count)[0] ?? null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Maior Colecionador */}
      <HighlightCard icon={Crown} label="🏆 Rei das Conquistas" iconClassName="text-status-warning">
        {topCollector ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <PlayerAvatar
                nickname={topCollector.player.nickname}
                avatarUrl={topCollector.player.avatarUrl}
                size="sm"
              />
              <span className="text-xs font-bold text-white truncate">
                {topCollector.player.nickname}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/55">
              {topCollector.count} conquista{topCollector.count !== 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/40">Nenhum ainda</p>
        )}
      </HighlightCard>

      {/* Conquista Mais Rara */}
      <HighlightCard icon={Gem} label="💎 Raridade do Museu" iconClassName="text-accent-violet">
        {rarestEntry ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-1.5 flex-wrap">
              <p className="text-xs font-bold text-white leading-tight">{rarestEntry.name}</p>
              <AchievementTierBadge tier={rarestEntry.tier} />
            </div>
            <p className="text-[10px] text-muted-foreground/55">
              {rarestEntry.unlockCount} jogador{rarestEntry.unlockCount !== 1 ? "es" : ""}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/40">Nenhuma desbloqueada</p>
        )}
      </HighlightCard>

      {/* Última Conquista */}
      <HighlightCard icon={Clock} label="⏱️ Amasso Mais Recente" iconClassName="text-accent-cyan">
        {lastUnlock ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <PlayerAvatar
                nickname={lastUnlock.player.nickname}
                avatarUrl={lastUnlock.player.avatarUrl}
                size="sm"
              />
              <span className="text-xs font-bold text-white truncate">
                {lastUnlock.player.nickname}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[10px] text-muted-foreground/70 truncate">
                {lastUnlock.achievement.name}
              </p>
              <AchievementTierBadge tier={lastUnlock.achievement.tier} />
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/40">Nenhuma ainda</p>
        )}
      </HighlightCard>

      {/* Jogador Mais Ativo */}
      <HighlightCard icon={Flame} label="🔥 Viciado em Conquistas" iconClassName="text-status-critical">
        {mostActive ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <PlayerAvatar
                nickname={mostActive.nickname}
                avatarUrl={mostActive.avatarUrl}
                size="sm"
              />
              <span className="text-xs font-bold text-white truncate">{mostActive.nickname}</span>
            </div>
            <p className="text-[10px] text-muted-foreground/55">
              {mostActive.count} recente{mostActive.count !== 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/40">Nenhum ainda</p>
        )}
      </HighlightCard>
    </div>
  );
}
