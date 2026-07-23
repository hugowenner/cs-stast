-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "steamAvatarFull" TEXT,
ADD COLUMN     "steamAvatarMedium" TEXT,
ADD COLUMN     "steamAvatarSmall" TEXT,
ADD COLUMN     "steamLastSync" TIMESTAMP(3),
ADD COLUMN     "steamNickname" TEXT,
ADD COLUMN     "steamProfileUrl" TEXT;
