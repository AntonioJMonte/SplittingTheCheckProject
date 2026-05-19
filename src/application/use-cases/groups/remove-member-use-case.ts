import Decimal from 'decimal.js'
import { GroupRepository } from '../../repositories/group-repository'
import { MemberRepository } from '../../repositories/member-repository'
import { ExpenseRepository } from '../../repositories/expense-repository'
import { SettlementRepository } from '../../repositories/settlement-repository'
import { AppError } from '../../../shared/errors/app-error'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { MemberHasPendingBalanceError } from '../../../shared/errors/member-has-pending-balance-error'

interface RemoveMemberUseCaseRequest {
    groupId: string
    requestedByUserId: string
    targetMemberId: string
}

export class RemoveMemberUseCase {

    constructor(
        private groupRepository: GroupRepository,
        private memberRepository: MemberRepository,
        private expenseRepository: ExpenseRepository,
        private settlementRepository: SettlementRepository,
    ) {}

    async execute({ groupId, requestedByUserId, targetMemberId }: RemoveMemberUseCaseRequest): Promise<void> {
        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new GroupNotFoundError()
        }

        const requestedBy = await this.memberRepository.findByUserAndGroup(requestedByUserId, groupId)
        if (!requestedBy) {
            throw new AppError('Sem permissão', 403)
        }

        const targetMember = await this.memberRepository.findById(targetMemberId)
        if (!targetMember || targetMember.groupId !== groupId) {
            throw new AppError('Usuário alvo não é membro deste grupo', 404)
        }

        const [expenses, settlements] = await Promise.all([
            this.expenseRepository.findByGroupId(groupId),
            this.settlementRepository.findConfirmedByMemberAndGroup(targetMember.id, groupId),
        ])

        let balance = new Decimal(0)
        for (const expense of expenses) {
            if (expense.payerId === targetMember.userId) {
                balance = balance.plus(expense.amount.toDecimal())
            }
            const share = expense.shares.find(s => s.memberId === targetMember.id)
            if (share) {
                balance = balance.minus(share.amount.toDecimal())
            }
        }
        for (const settlement of settlements) {
            if (settlement.fromMemberId === targetMember.id) {
                balance = balance.plus(settlement.amount.toDecimal())
            } else {
                balance = balance.minus(settlement.amount.toDecimal())
            }
        }

        if (!balance.isZero()) {
            throw new MemberHasPendingBalanceError()
        }

        group.removeMember(requestedBy, targetMember.userId)
        await this.memberRepository.removeMemberGroup(targetMember.id)
    }
}
