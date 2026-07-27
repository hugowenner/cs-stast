-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "demoUrl" TEXT;

-- AlterTable
ALTER TABLE "PlayerMatchStats" ADD COLUMN     "clutchesWon" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "flashAssists" INTEGER NOT NULL DEFAULT 0;
