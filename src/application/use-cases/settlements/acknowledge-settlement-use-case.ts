import Decimal from 'decimal.js'
import { MemberRepository } from '../../repositories/member-repository'
import { SettlementRepository } from '../../repositories/settlement-repository'
import { SettlementNotFoundError } from '../../../shared/errors/settlement-not-found-error'
import { SettlementAlreadyConfirmedError } from '../../../shared/errors/settlement-already-confirmed-error'
import { SettlementCancelledError } from '../../../shared/errors/settlement-cancelled-error'
import { UnauthorizedError } from '../../../shared/errors/unauthorized-error'
import { MemberNotFoundError } from '../../../shared/errors/member-not-found-error'

interface AcknowledgeSettlementUseCaseRequest {
    settlementId: string
    requestUserId: string
}

interface AcknowledgeSettlementUseCaseResponse {
    settlement: {
        id: string
        fromMemberId: string
        toMemberId: string
        amount: Decimal
        status: 'CONFIRMED'
        confirmedAt: Date
    }
}

export class AcknowledgeSettlementUseCase {

    constructor(
        private settlementRepository: SettlementRepository,
        private memberRepository: MemberRepository,
    ) {}

    async execute({
        settlementId,
        requestUserId,
    }: AcknowledgeSettlementUseCaseRequest): Promise<AcknowledgeSettlementUseCaseResponse> {
        const settlement = await this.settlementRepository.findById(settlementId)
        if (!settlement) {
            throw new SettlementNotFoundError()
        }

        if (settlement.status === 'CONFIRMED') {
            throw new SettlementAlreadyConfirmedError()
        }

        if (settlement.status === 'CANCELLED') {
            throw new SettlementCancelledError()
        }

        const toMember = await this.memberRepository.findById(settlement.toMemberId)
        if (!toMember) {
            throw new MemberNotFoundError()
        }

        if (toMember.userId !== requestUserId) {
            throw new UnauthorizedError()
        }

        settlement.confirm()
        await this.settlementRepository.updateStatus(settlementId, 'CONFIRMED')

        return {
            settlement: {
                id: settlement.id,
                fromMemberId: settlement.fromMemberId,
                toMemberId: settlement.toMemberId,
                amount: settlement.amount.toDecimal(),
                status: 'CONFIRMED',
                confirmedAt: settlement.confirmedAt!,
            },
        }
    }
}
