import Decimal from 'decimal.js'
import { GroupRepository } from '../../repositories/group-repository'
import { MemberRepository } from '../../repositories/member-repository'
import { ExpenseRepository } from '../../repositories/expense-repository'
import { SettlementRepository } from '../../repositories/settlement-repository'
import { DebtMinimizer } from '../../../domain/services/debt-minimizer'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'

interface ComputeSettlementsUseCaseRequest {
    groupId: string
    requestUserId: string
}

interface SettlementSuggestion {
    fromMemberId: string
    fromMemberName: string
    toMemberId: string
    toMemberName: string
    amount: Decimal
}

interface ComputeSettlementsUseCaseResponse {
    settlements: SettlementSuggestion[]
}

export class ComputeSettlementsUseCase {

    constructor(
        private groupRepository: GroupRepository,
        private memberRepository: MemberRepository,
        private expenseRepository: ExpenseRepository,
        private settlementRepository: SettlementRepository,
    ) {}

    async execute({ groupId, requestUserId }: ComputeSettlementsUseCaseRequest): Promise<ComputeSettlementsUseCaseResponse> {
        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new GroupNotFoundError()
        }

        const requestingMember = await this.memberRepository.findByUserAndGroup(requestUserId, groupId)
        if (!requestingMember) {
            throw new NotGroupMemberError()
        }

        const [members, membersWithUser, expenses, confirmedSettlements] = await Promise.all([
            this.memberRepository.findByGroupId(groupId),
            this.memberRepository.findByGroupIdWithUser(groupId),
            this.expenseRepository.findByGroupId(groupId),
            this.settlementRepository.findConfirmedByGroup(groupId),
        ])

        const nameByMemberId = new Map(membersWithUser.map(m => [m.id, m.name]))

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

        const settlements = transfers.map(t => ({
            fromMemberId: t.fromMemberId,
            fromMemberName: nameByMemberId.get(t.fromMemberId) ?? '',
            toMemberId: t.toMemberId,
            toMemberName: nameByMemberId.get(t.toMemberId) ?? '',
            amount: t.amount.toDecimal(),
        }))

        return { settlements }
    }
}
