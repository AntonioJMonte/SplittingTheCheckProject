import { ListExpensesUseCase } from '../../application/use-cases/expenses/list-expenses-use-case'
import { PrismaExpenseRepository } from '../database/prisma/prismaExpenseRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'

export function makeListExpensesUseCase() {
    const expenseRepository = new PrismaExpenseRepository()
    const memberRepository = new PrismaMemberRepository()
    return new ListExpensesUseCase(expenseRepository, memberRepository)
}
