import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { FadeIn } from "@/components/motion/fade-in";
import { safeQuery } from "@/server/safeQuery";
import * as sessionService from "@/server/services/session.service";

export default async function SessionsPage() {
  const sessions = await safeQuery(() => sessionService.listSessions({ take: 50 }), []);

  return (
    <div className="flex flex-col gap-4">
      <FadeIn>
        <h1 className="text-2xl font-bold tracking-tight">Sessões</h1>
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
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
                >
                  <div className="bg-accent-violet/15 text-accent-violet flex size-9 items-center justify-center rounded-lg">
                    <CalendarDays className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{session.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {session.date.toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}
