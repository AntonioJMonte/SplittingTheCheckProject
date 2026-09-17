-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "pendingKey" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- Backfill: acertos PENDING existentes recebem a chave antes do índice único.
-- Se já houver dois PENDING para o mesmo par, o CREATE UNIQUE INDEX abaixo falha de propósito.
UPDATE "Settlement"
SET "pendingKey" = "fromMemberId" || ':' || "toMemberId"
WHERE "status" = 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_pendingKey_key" ON "Settlement"("pendingKey");
