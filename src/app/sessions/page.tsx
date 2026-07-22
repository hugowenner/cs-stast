import { CalendarDays } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { PageHeader } from "@/components/ui/page-header";
import { RankRow } from "@/components/ui/rank-row";
import { FadeIn } from "@/components/motion/fade-in";
import { safeQuery } from "@/server/safeQuery";
import * as sessionService from "@/server/services/session.service";

export default async function SessionsPage() {
  const sessions = await safeQuery(() => sessionService.listSessions({ take: 50 }), []);

  return (
    <div className="flex flex-col gap-4">
      <FadeIn>
        <PageHeader title="📅 Sessões" subtitle="Histórico de noites de jogo do grupo" />
      </FadeIn>

      <FadeIn delay={0.05}>
        <SectionCard>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Nenhuma sessão registrada ainda.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {sessions.map((session) => (
                <RankRow
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  icon={
                    <div className="bg-accent-violet/15 text-accent-violet flex size-9 items-center justify-center rounded-lg">
                      <CalendarDays className="size-4" />
                    </div>
                  }
                  title={session.name}
                  subtitle={session.date.toLocaleDateString("pt-BR")}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}
