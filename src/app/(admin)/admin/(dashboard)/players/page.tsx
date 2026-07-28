import { PlayersManager } from "@/components/admin/players/PlayersManager";
import * as playerService from "@/server/services/player.service";

export const metadata = {
  title: "Gerenciamento de Jogadores — CS2 Stats Hub Admin",
  description: "Central de moderação e monitoramento de jogadores do Hub.",
};

interface PageProps {
  searchParams: Promise<{
    search?: string;
    filter?: string;
    page?: string;
  }>;
}

export default async function AdminPlayersPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search || "";
  const filter = resolvedSearchParams.filter || "all";
  const currentPage = parseInt(resolvedSearchParams.page || "1", 10);
  
  const pageSize = 10;
  const skip = (currentPage - 1) * pageSize;

  // Fetch summary and paginated players in parallel on the server
  const [summary, { players, total }] = await Promise.all([
    playerService.getPlayersAdminSummary(),
    playerService.listPlayersForAdmin({
      search,
      filter,
      skip,
      take: pageSize,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">
          Jogadores
        </h1>
        <p className="text-xs text-muted-foreground">
          Gerencie apelidos, monitore status de conexões e verifique a integridade de dados da Steam e Gamers Club.
        </p>
      </div>

      {/* Players Manager client component to coordinate UI and modals */}
      <PlayersManager
        summary={summary}
        players={players}
        total={total}
        currentPage={currentPage}
        pageSize={pageSize}
      />
    </div>
  );
}
