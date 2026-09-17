import { CategorizeExpenseUseCase } from '../../application/use-cases/expenses/categorize-expense-use-case'
import { PrismaExpenseRepository } from '../database/prisma/prismaExpenseRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'
import { makeExpenseCategorizer } from './make-expense-categorizer'

export function makeCategorizeExpenseUseCase() {
    const expenseRepository = new PrismaExpenseRepository()
    const memberRepository = new PrismaMemberRepository()
    return new CategorizeExpenseUseCase(expenseRepository, memberRepository, makeExpenseCategorizer())
}
