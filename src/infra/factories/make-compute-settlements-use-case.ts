import { ComputeSettlementsUseCase } from '../../application/use-cases/settlements/compute-settlements-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'
import { PrismaExpenseRepository } from '../database/prisma/prismaExpenseRepository'
import { PrismaSettlementRepository } from '../database/prisma/prismaSettlementRepository'

export function makeComputeSettlementsUseCase() {
    const groupRepository = new PrismaGroupRepository()
    const memberRepository = new PrismaMemberRepository()
    const expenseRepository = new PrismaExpenseRepository()
    const settlementRepository = new PrismaSettlementRepository()
    return new ComputeSettlementsUseCase(groupRepository, memberRepository, expenseRepository, settlementRepository)
}
