import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { safeQuery } from "@/server/safeQuery";
import * as playerService from "@/server/services/player.service";

export default async function PlayersPage() {
  const players = await safeQuery(() => playerService.listPlayers({ take: 100 }), []);

  return (
    <div className="flex flex-col gap-4">
      <FadeIn>
        <h1 className="text-2xl font-bold tracking-tight">Jogadores</h1>
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
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
                >
                  <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} />
                  <span className="truncate text-sm font-medium">{player.nickname}</span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}
