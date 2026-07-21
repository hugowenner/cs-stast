Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MatchTeam" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('KILL', 'ACE', 'CLUTCH_1V1', 'CLUTCH_1V2', 'CLUTCH_1V3', 'CLUTCH_1V4', 'CLUTCH_1V5', 'MULTI_KILL_3', 'MULTI_KILL_4', 'MULTI_KILL_5');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "steamId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "gamersClubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "playerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Map" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "Map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "gamersClubMatchId" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "scoreTeamA" INTEGER NOT NULL,
    "scoreTeamB" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerMatchStats" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "team" "MatchTeam" NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "headshots" INTEGER NOT NULL,
    "adr" DOUBLE PRECISION NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "kast" DOUBLE PRECISION NOT NULL,
    "impact" DOUBLE PRECISION NOT NULL,
    "entryKills" INTEGER NOT NULL,
    "entryDeaths" INTEGER NOT NULL,
    "tradeKills" INTEGER NOT NULL,
    "clutch1v1Attempts" INTEGER NOT NULL DEFAULT 0,
    "clutch1v1Wins" INTEGER NOT NULL DEFAULT 0,
    "clutch1v2Attempts" INTEGER NOT NULL DEFAULT 0,
    "clutch1v2Wins" INTEGER NOT NULL DEFAULT 0,
    "clutch1v3Attempts" INTEGER NOT NULL DEFAULT 0,
    "clutch1v3Wins" INTEGER NOT NULL DEFAULT 0,
    "clutch1v4Attempts" INTEGER NOT NULL DEFAULT 0,
    "clutch1v4Wins" INTEGER NOT NULL DEFAULT 0,
    "clutch1v5Attempts" INTEGER NOT NULL DEFAULT 0,
    "clutch1v5Wins" INTEGER NOT NULL DEFAULT 0,
    "eloBefore" INTEGER NOT NULL,
    "eloAfter" INTEGER NOT NULL,

    CONSTRAINT "PlayerMatchStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "tier" TEXT NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "matchId" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rivalry" (
    "id" TEXT NOT NULL,
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT NOT NULL,
    "killsAOnB" INTEGER NOT NULL DEFAULT 0,
    "killsBOnA" INTEGER NOT NULL DEFAULT 0,
    "matchesTogether" INTEGER NOT NULL DEFAULT 0,
    "matchesAgainst" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rivalry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "victimId" TEXT,
    "type" "EventType" NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "providerVersion" INTEGER NOT NULL DEFAULT 1,
    "rawPayload" JSONB,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "matchesImported" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_steamId_key" ON "Player"("steamId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gamersClubId_key" ON "Player"("gamersClubId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Map_name_key" ON "Map"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Match_gamersClubMatchId_key" ON "Match"("gamersClubMatchId");

-- CreateIndex
CREATE INDEX "Match_sessionId_idx" ON "Match"("sessionId");

-- CreateIndex
CREATE INDEX "Match_playedAt_idx" ON "Match"("playedAt");

-- CreateIndex
CREATE INDEX "PlayerMatchStats_playerId_idx" ON "PlayerMatchStats"("playerId");

-- CreateIndex
CREATE INDEX "PlayerMatchStats_matchId_idx" ON "PlayerMatchStats"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchStats_matchId_playerId_key" ON "PlayerMatchStats"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE INDEX "PlayerAchievement_playerId_idx" ON "PlayerAchievement"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_playerId_achievementId_matchId_key" ON "PlayerAchievement"("playerId", "achievementId", "matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Rivalry_playerAId_playerBId_key" ON "Rivalry"("playerAId", "playerBId");

-- CreateIndex
CREATE INDEX "Event_matchId_idx" ON "Event"("matchId");

-- CreateIndex
CREATE INDEX "Event_playerId_idx" ON "Event"("playerId");

-- CreateIndex
CREATE INDEX "Event_victimId_idx" ON "Event"("victimId");

-- CreateIndex
CREATE INDEX "Log_level_idx" ON "Log"("level");

-- CreateIndex
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchStats" ADD CONSTRAINT "PlayerMatchStats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchStats" ADD CONSTRAINT "PlayerMatchStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rivalry" ADD CONSTRAINT "Rivalry_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rivalry" ADD CONSTRAINT "Rivalry_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_victimId_fkey" FOREIGN KEY ("victimId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Partial unique index: cumulative achievements (matchId IS NULL) must be unique per player.
-- Postgres treats NULL as distinct in a normal UNIQUE constraint, so this cannot be expressed
-- declaratively in schema.prisma; enforced here instead. Per-match achievements keep using the
-- @@unique([playerId, achievementId, matchId]) constraint from the schema.
CREATE UNIQUE INDEX "PlayerAchievement_cumulative_unique" ON "PlayerAchievement"("playerId", "achievementId") WHERE "matchId" IS NULL;
