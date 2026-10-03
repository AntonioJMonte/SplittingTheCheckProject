import { prisma } from '../../../infra/database/prisma/prismaClient'

// Lista explícita em vez de depender do CASCADE: uma tabela nova que fique de fora daqui
// aparece como dado sobrando entre testes, não como limpeza silenciosa por acaso.
export async function resetDatabase(): Promise<void> {
    await prisma.$executeRawUnsafe(
        'TRUNCATE TABLE "ExpenseRevision", "ExpenseShare", "Expense", "Settlement", "Member", "Group", "User" CASCADE',
    )
}
