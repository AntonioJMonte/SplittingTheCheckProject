import Decimal from 'decimal.js'
import { MemberRepository } from '../../repositories/member-repository'
import { ExpenseRepository } from '../../repositories/expense-repository'
import { SettlementRepository } from '../../repositories/settlement-repository'
import { UserRepository } from '../../repositories/users-repository'
import { PixGenerator } from '../../services/pix-generator'
import { DebtMinimizer } from '../../../domain/services/debt-minimizer'
import { Settlement } from '../../../domain/entities/settlement'
import { Money } from '../../../domain/value-objects/money'
import { MemberNotFoundError } from '../../../shared/errors/member-not-found-error'
import { MemberNotInSameGroupError } from '../../../shared/errors/member-not-in-same-group-error'
import { UnauthorizedError } from '../../../shared/errors/unauthorized-error'
import { AmountExceedsDebtError } from '../../../shared/errors/amount-exceeds-debt-error'
import { SettlementAlreadyPendingError } from '../../../shared/errors/settlement-already-pending-error'

interface ConfirmSettlementUseCaseRequest {
    fromMemberId: string
    toMemberId: string
    amount: Decimal
    requestUserId: string
}

interface ConfirmSettlementUseCaseResponse {
    settlement: {
        id: string
        fromMemberId: string
        toMemberId: string
        amount: Decimal
        status: 'PENDING'
        pixCopyPaste: string | null
    }
}

function toResponse(settlement: Settlement): ConfirmSettlementUseCaseResponse['settlement'] {
    return {
        id: settlement.id,
        fromMemberId: settlement.fromMemberId,
        toMemberId: settlement.toMemberId,
        amount: settlement.amount.toDecimal(),
        status: 'PENDING',
        pixCopyPaste: settlement.pixCopyPaste ?? null,
    }
}

export class ConfirmSettlementUseCase {

    constructor(
        private memberRepository: MemberRepository,
        private expenseRepository: ExpenseRepository,
        private settlementRepository: SettlementRepository,
        private userRepository: UserRepository,
        private pixGenerator: PixGenerator,
    ) {}

    async execute({
        fromMemberId,
        toMemberId,
        amount,
        requestUserId,
    }: ConfirmSettlementUseCaseRequest): Promise<ConfirmSettlementUseCaseResponse> {
        const fromMember = await this.memberRepository.findById(fromMemberId)
        if (!fromMember) {
            throw new MemberNotFoundError()
        }

        const toMember = await this.memberRepository.findById(toMemberId)
        if (!toMember) {
            throw new MemberNotFoundError()
        }

        if (fromMember.groupId !== toMember.groupId) {
            throw new MemberNotInSameGroupError()
        }

        if (fromMember.userId !== requestUserId) {
            throw new UnauthorizedError()
        }

        const existing = await this.settlementRepository.findPendingBetweenMembers(fromMemberId, toMemberId)
        if (existing) {
            if (existing.amount.toDecimal().equals(amount)) {
                return { settlement: toResponse(existing) }
            }
            throw new SettlementAlreadyPendingError()
        }

        const groupId = fromMember.groupId
        const [members, expenses, confirmedSettlements] = await Promise.all([
            this.memberRepository.findByGroupId(groupId),
            this.expenseRepository.findByGroupId(groupId),
            this.settlementRepository.findConfirmedByGroup(groupId),
        ])

        const balances = members.map(member => {
            const paidAsPayerTotal = expenses
                .filter(e => e.payerId === member.userId)
                .reduce((acc, e) => acc.plus(e.amount.toDecimal()), new Decimal(0))

            const owedInSharesTotal = expenses
                .flatMap(e => e.shares)
                .filter(s => s.memberId === member.id)
                .reduce((acc, s) => acc.plus(s.amount.toDecimal()), new Decimal(0))

            const receivedViaSettlementsTotal = confirmedSettlements
                .filter(s => s.toMemberId === member.id)
                .reduce((acc, s) => acc.plus(s.amount.toDecimal()), new Decimal(0))

            const paidViaSettlementsTotal = confirmedSettlements
                .filter(s => s.fromMemberId === member.id)
                .reduce((acc, s) => acc.plus(s.amount.toDecimal()), new Decimal(0))

            return {
                memberId: member.id,
                balance: paidAsPayerTotal
                    .minus(owedInSharesTotal)
                    .minus(receivedViaSettlementsTotal)
                    .plus(paidViaSettlementsTotal),
            }
        })

        const transfers = DebtMinimizer.minimize(balances)
        const suggestedTransfer = transfers.find(
            t => t.fromMemberId === fromMemberId && t.toMemberId === toMemberId,
        )
        const maxDebt = suggestedTransfer ? suggestedTransfer.amount.toDecimal() : new Decimal(0)

        if (amount.greaterThan(maxDebt)) {
            throw new AmountExceedsDebtError()
        }

        const toUser = await this.userRepository.findById(toMember.userId)

        let pixCopyPaste: string | undefined
        if (toUser?.pixKey) {
            pixCopyPaste = this.pixGenerator.generate({
                pixKey: toUser.pixKey,
                recipientName: toUser.name,
                amount: amount.toFixed(2),
            })
        }

        const settlement = Settlement.create({
            groupId,
            fromMemberId,
            toMemberId,
            amount: new Money(amount),
            pixCopyPaste,
        })

        await this.settlementRepository.create(settlement)

        return { settlement: toResponse(settlement) }
    }
}
