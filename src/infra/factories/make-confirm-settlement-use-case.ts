import { ConfirmSettlementUseCase } from '../../application/use-cases/settlements/confirm-settlement-use-case'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'
import { PrismaExpenseRepository } from '../database/prisma/prismaExpenseRepository'
import { PrismaSettlementRepository } from '../database/prisma/prismaSettlementRepository'
import { PrismaUserRepository } from '../database/prisma/prismaUserRepository'
import { BrazilianPixGenerator } from '../pix/pix-generator'

export function makeConfirmSettlementUseCase() {
    const memberRepository = new PrismaMemberRepository()
    const expenseRepository = new PrismaExpenseRepository()
    const settlementRepository = new PrismaSettlementRepository()
    const userRepository = new PrismaUserRepository()
    const pixGenerator = new BrazilianPixGenerator()
    return new ConfirmSettlementUseCase(
        memberRepository,
        expenseRepository,
        settlementRepository,
        userRepository,
        pixGenerator,
    )
}
