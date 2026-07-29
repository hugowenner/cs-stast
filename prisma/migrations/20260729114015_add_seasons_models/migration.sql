-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "seasonId" TEXT;

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonSnapshot" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "dashboard" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Season_status_idx" ON "Season"("status");

-- CreateIndex
CREATE INDEX "Season_startDate_endDate_idx" ON "Season"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonSnapshot_seasonId_key" ON "SeasonSnapshot"("seasonId");

-- CreateIndex
CREATE INDEX "Match_seasonId_idx" ON "Match"("seasonId");

-- CreateIndex
CREATE INDEX "Match_seasonId_playedAt_idx" ON "Match"("seasonId", "playedAt");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonSnapshot" ADD CONSTRAINT "SeasonSnapshot_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
