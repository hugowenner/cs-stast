-- Classificação SOLO x COMUNIDADE de partidas.
-- Ver src/server/domain/matchClassification.ts para a regra (>= 2 jogadores
-- monitorados ativos = COMUNIDADE). Esta migration NÃO foi aplicada
-- automaticamente — rode manualmente (npx prisma migrate deploy, ou
-- npx prisma db push se o projeto continuar sem histórico formal de migrations).

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "trackedPlayersCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill: recalcula trackedPlayersCount para todas as partidas já existentes,
-- contando jogadores DISTINTOS de PlayerMatchStats que têm um TrackedPlayer
-- ativo vinculado. Sem este passo, toda partida já sincronizada ficaria com 0
-- (classificada como SOLO), mesmo partidas que claramente envolveram o grupo.
UPDATE "Match" m
SET "trackedPlayersCount" = sub.cnt
FROM (
  SELECT pms."matchId" AS match_id, COUNT(DISTINCT pms."playerId") AS cnt
  FROM "PlayerMatchStats" pms
  INNER JOIN "tracked_players" tp
    ON tp.player_id = pms."playerId" AND tp.active = true
  GROUP BY pms."matchId"
) sub
WHERE m.id = sub.match_id;

-- CreateIndex
CREATE INDEX "Match_trackedPlayersCount_idx" ON "Match"("trackedPlayersCount");
