import { SectionCard } from "@/components/ui/section-card";
import { PageHeader } from "@/components/ui/page-header";
import { RankRow } from "@/components/ui/rank-row";
import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { safeQuery } from "@/server/safeQuery";
import * as playerService from "@/server/services/player.service";

export default async function PlayersPage() {
  const players = await safeQuery(() => playerService.listPlayers({ take: 100 }), []);

  return (
    <div className="flex flex-col gap-4">
      <FadeIn>
        <PageHeader title="👥 Jogadores" subtitle={`${players.length} jogadores monitorados`} />
      </FadeIn>

      <FadeIn delay={0.05}>
        <SectionCard>
          {players.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Nenhum jogador sincronizado ainda.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {players.map((player) => (
                <RankRow
                  key={player.id}
                  href={`/players/${player.id}`}
                  icon={<PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} />}
                  title={player.nickname}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}
