import { DeleteExpenseUseCase } from '../../application/use-cases/expenses/delete-expense-use-case'
import { PrismaExpenseRepository } from '../database/prisma/prismaExpenseRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'

export function makeDeleteExpenseUseCase() {
    const expenseRepository = new PrismaExpenseRepository()
    const memberRepository = new PrismaMemberRepository()
    return new DeleteExpenseUseCase(expenseRepository, memberRepository)
}
