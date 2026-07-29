-- CreateTable
CREATE TABLE "TeamBalanceMatch" (
    "id" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "winner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamBalanceMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_balance_players" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "tracked_player_id" TEXT,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "team" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "guest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "team_balance_players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamBalanceMatch_createdAt_idx" ON "TeamBalanceMatch"("createdAt");

-- CreateIndex
CREATE INDEX "TeamBalanceMatch_seed_idx" ON "TeamBalanceMatch"("seed");

-- AddForeignKey
ALTER TABLE "team_balance_players" ADD CONSTRAINT "team_balance_players_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "TeamBalanceMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_balance_players" ADD CONSTRAINT "team_balance_players_tracked_player_id_fkey" FOREIGN KEY ("tracked_player_id") REFERENCES "tracked_players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
