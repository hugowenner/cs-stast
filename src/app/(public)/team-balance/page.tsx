import * as teamBalanceService from "@/server/services/team-balance.service";
import { TeamBalanceClient } from "./team-balance-client";
import { safeQuery } from "@/server/safeQuery";

export const dynamic = "force-dynamic";

export default async function TeamBalancePage() {
  // Carrega a lista inicial de jogadores consolidados no servidor para evitar waterfall/loading-state
  const initialPlayers = await safeQuery(() => teamBalanceService.getAvailablePlayers(), []);
  
  return <TeamBalanceClient initialPlayers={initialPlayers} />;
}
