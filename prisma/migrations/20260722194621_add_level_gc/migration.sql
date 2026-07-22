-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "levelGc" INTEGER;

-- AlterTable
ALTER TABLE "PlayerMatchStats" ADD COLUMN     "levelGc" INTEGER;

-- CreateTable
CREATE TABLE "tracked_players" (
    "id" TEXT NOT NULL,
    "gamersclub_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nickname" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "player_id" TEXT,

    CONSTRAINT "tracked_players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tracked_players_gamersclub_id_key" ON "tracked_players"("gamersclub_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_players_player_id_key" ON "tracked_players"("player_id");

-- AddForeignKey
ALTER TABLE "tracked_players" ADD CONSTRAINT "tracked_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
