import { LeaveGroupUseCase } from '../../application/use-cases/groups/leave-group-use-case'
import { PrismaGroupRepository } from '../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'
import { PrismaExpenseRepository } from '../database/prisma/prismaExpenseRepository'
import { PrismaSettlementRepository } from '../database/prisma/prismaSettlementRepository'

export function makeLeaveGroupUseCase() {
    const groupRepository = new PrismaGroupRepository()
    const memberRepository = new PrismaMemberRepository()
    const expenseRepository = new PrismaExpenseRepository()
    const settlementRepository = new PrismaSettlementRepository()
    return new LeaveGroupUseCase(groupRepository, memberRepository, expenseRepository, settlementRepository)
}
