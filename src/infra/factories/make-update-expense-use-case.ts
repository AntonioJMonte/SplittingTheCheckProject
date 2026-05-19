import { UpdateExpenseUseCase } from '../../application/use-cases/expenses/update-expense-use-case'
import { PrismaExpenseRepository } from '../database/prisma/prismaExpenseRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaSettlementRepository } from '../database/prisma/prismaSettlementRepository'

export function makeUpdateExpenseUseCase() {
    const expenseRepository = new PrismaExpenseRepository()
    const memberRepository = new PrismaMemberRepository()
    const groupRepository = new PrismaGroupRepository()
    const settlementRepository = new PrismaSettlementRepository()
    return new UpdateExpenseUseCase(expenseRepository, memberRepository, groupRepository, settlementRepository)
}
