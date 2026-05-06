import { GetGroupBalancesUseCase } from '../../application/use-cases/groups/get-group-balances-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'
import { PrismaExpenseRepository } from '../database/prisma/prismaExpenseRepository'

export function makeGetGroupBalancesUseCase() {
    const groupRepository = new PrismaGroupRepository()
    const memberRepository = new PrismaMemberRepository()
    const expenseRepository = new PrismaExpenseRepository()
    return new GetGroupBalancesUseCase(groupRepository, memberRepository, expenseRepository)
}
