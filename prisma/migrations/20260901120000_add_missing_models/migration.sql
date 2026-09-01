-- Migration: add_missing_models
-- Adds SyncJob, MatchPayload, PlayerMatchup, PlayerClutch, PlayerEntryDuel,
-- PlayerTradeEvent tables and updates Rivalry for season-aware unique constraint.
-- Generated from: prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'SENT_TO_WORKER', 'PROCESSING', 'COMPLETED', 'FAILED');

-- DropIndex (old non-season-aware unique on Rivalry)
DROP INDEX "Rivalry_playerAId_playerBId_key";

-- AlterTable (add seasonId to Rivalry)
ALTER TABLE "Rivalry" ADD COLUMN "seasonId" TEXT;

-- CreateTable: sync_jobs
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "sourceMatchId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'gamersclub',
    "downloadUrl" TEXT NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: match_payloads
CREATE TABLE "match_payloads" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceMatchId" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STORED',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_payloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PlayerMatchup
CREATE TABLE "PlayerMatchup" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "killerId" TEXT NOT NULL,
    "victimId" TEXT NOT NULL,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "headshots" INTEGER NOT NULL DEFAULT 0,
    "entryKills" INTEGER NOT NULL DEFAULT 0,
    "tradeKills" INTEGER NOT NULL DEFAULT 0,
    "weapons" JSONB,
    "rounds" JSONB,
    "avgDistance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerMatchup_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PlayerClutch
CREATE TABLE "PlayerClutch" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "opponents" INTEGER NOT NULL,
    "won" BOOLEAN NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "side" "MatchTeam" NOT NULL,
    "weapon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerClutch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PlayerEntryDuel
CREATE TABLE "PlayerEntryDuel" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "isKiller" BOOLEAN NOT NULL,
    "side" "MatchTeam" NOT NULL,
    "weapon" TEXT,
    "roundNumber" INTEGER NOT NULL,
    "opponentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerEntryDuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PlayerTradeEvent
CREATE TABLE "PlayerTradeEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "victimId" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "timeDiff" DOUBLE PRECISION NOT NULL,
    "weapon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerTradeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs"("status");

-- CreateIndex
CREATE INDEX "sync_jobs_sourceMatchId_idx" ON "sync_jobs"("sourceMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "match_payloads_source_sourceMatchId_key" ON "match_payloads"("source", "sourceMatchId");

-- CreateIndex
CREATE INDEX "PlayerMatchup_killerId_victimId_idx" ON "PlayerMatchup"("killerId", "victimId");

-- CreateIndex
CREATE INDEX "PlayerMatchup_matchId_idx" ON "PlayerMatchup"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchup_matchId_killerId_victimId_key" ON "PlayerMatchup"("matchId", "killerId", "victimId");

-- CreateIndex
CREATE INDEX "PlayerClutch_matchId_idx" ON "PlayerClutch"("matchId");

-- CreateIndex
CREATE INDEX "PlayerClutch_playerId_idx" ON "PlayerClutch"("playerId");

-- CreateIndex
CREATE INDEX "PlayerEntryDuel_matchId_idx" ON "PlayerEntryDuel"("matchId");

-- CreateIndex
CREATE INDEX "PlayerEntryDuel_playerId_idx" ON "PlayerEntryDuel"("playerId");

-- CreateIndex
CREATE INDEX "PlayerTradeEvent_matchId_idx" ON "PlayerTradeEvent"("matchId");

-- CreateIndex
CREATE INDEX "PlayerTradeEvent_victimId_idx" ON "PlayerTradeEvent"("victimId");

-- CreateIndex
CREATE INDEX "PlayerTradeEvent_traderId_idx" ON "PlayerTradeEvent"("traderId");

-- CreateIndex (new season-aware unique on Rivalry)
CREATE UNIQUE INDEX "Rivalry_playerAId_playerBId_seasonId_key" ON "Rivalry"("playerAId", "playerBId", "seasonId");

-- AddForeignKey
ALTER TABLE "Rivalry" ADD CONSTRAINT "Rivalry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchup" ADD CONSTRAINT "PlayerMatchup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchup" ADD CONSTRAINT "PlayerMatchup_killerId_fkey" FOREIGN KEY ("killerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchup" ADD CONSTRAINT "PlayerMatchup_victimId_fkey" FOREIGN KEY ("victimId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerClutch" ADD CONSTRAINT "PlayerClutch_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerClutch" ADD CONSTRAINT "PlayerClutch_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEntryDuel" ADD CONSTRAINT "PlayerEntryDuel_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEntryDuel" ADD CONSTRAINT "PlayerEntryDuel_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTradeEvent" ADD CONSTRAINT "PlayerTradeEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTradeEvent" ADD CONSTRAINT "PlayerTradeEvent_victimId_fkey" FOREIGN KEY ("victimId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTradeEvent" ADD CONSTRAINT "PlayerTradeEvent_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
