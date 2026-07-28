import { prisma } from "@/server/db";
import { SyncManager } from "@/components/admin/sync/SyncManager";

export const metadata = {
  title: "Sincronizações — CS2 Stats Hub Admin",
  description: "Histórico e controle das rotinas de sincronização de partidas do Hub.",
};

export default async function AdminSyncPage() {
  // Query the 30 most recent synchronization operations from the database
  const syncLogs = await prisma.import.findMany({
    take: 30,
    orderBy: {
      startedAt: "desc",
    },
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">
          Sincronizações
        </h1>
        <p className="text-xs text-muted-foreground">
          Acompanhe o histórico de ingestões de partidas da Gamers Club e a taxa de saúde das rotinas de sync.
        </p>
      </div>

      {/* Sync Manager client component */}
      <SyncManager logs={syncLogs} />
    </div>
  );
}
