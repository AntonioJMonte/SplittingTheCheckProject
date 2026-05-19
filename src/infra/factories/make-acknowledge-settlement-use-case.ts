import { AcknowledgeSettlementUseCase } from '../../application/use-cases/settlements/acknowledge-settlement-use-case'
import { PrismaSettlementRepository } from '../database/prisma/prismaSettlementRepository'
import { PrismaMemberRepository } from '../database/prisma/prismaMemberRepository'

export function makeAcknowledgeSettlementUseCase() {
    const settlementRepository = new PrismaSettlementRepository()
    const memberRepository = new PrismaMemberRepository()
    return new AcknowledgeSettlementUseCase(settlementRepository, memberRepository)
}
