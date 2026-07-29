/*
  Warnings:

  - You are about to drop the column `tracked_player_id` on the `team_balance_players` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "team_balance_players" DROP CONSTRAINT "team_balance_players_tracked_player_id_fkey";

-- AlterTable
ALTER TABLE "team_balance_players" DROP COLUMN "tracked_player_id",
ADD COLUMN     "player_id" TEXT;

-- AddForeignKey
ALTER TABLE "team_balance_players" ADD CONSTRAINT "team_balance_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
