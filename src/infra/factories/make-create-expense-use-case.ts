import { CreateExpenseUseCase } from '../../application/use-cases/expenses/create-expense-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaExpenseRepository } from '../database/prisma/prismaExpenseRepository'

export function makeCreateExpenseUseCase() {
    const groupRepository = new PrismaGroupRepository()
    const expenseRepository = new PrismaExpenseRepository()
    return new CreateExpenseUseCase(groupRepository, expenseRepository)
}
