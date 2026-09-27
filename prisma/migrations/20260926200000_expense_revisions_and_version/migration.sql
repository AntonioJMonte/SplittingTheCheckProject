-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ExpenseRevision" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "splitMethod" TEXT NOT NULL,
    "category" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "shares" JSONB NOT NULL,
    "editedBy" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRevision_expenseId_version_key" ON "ExpenseRevision"("expenseId", "version");

-- CreateIndex
CREATE INDEX "ExpenseRevision_expenseId_editedAt_idx" ON "ExpenseRevision"("expenseId", "editedAt");

-- AddForeignKey
ALTER TABLE "ExpenseRevision" ADD CONSTRAINT "ExpenseRevision_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
