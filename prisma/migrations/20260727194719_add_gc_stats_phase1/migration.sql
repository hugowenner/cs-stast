-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "roundsJson" JSONB;

-- AlterTable
ALTER TABLE "PlayerMatchStats" ADD COLUMN     "aces" INTEGER,
ADD COLUMN     "damage" INTEGER,
ADD COLUMN     "doubleKills" INTEGER,
ADD COLUMN     "gcRating" DOUBLE PRECISION,
ADD COLUMN     "quadKills" INTEGER,
ADD COLUMN     "tripleKills" INTEGER;
