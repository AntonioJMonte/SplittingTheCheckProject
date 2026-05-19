import Decimal from 'decimal.js'
import { GroupRepository } from '../../repositories/group-repository'
import { MemberRepository } from '../../repositories/member-repository'
import { ExpenseRepository } from '../../repositories/expense-repository'
import { SettlementRepository } from '../../repositories/settlement-repository'
import { AppError } from '../../../shared/errors/app-error'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { MemberHasPendingBalanceError } from '../../../shared/errors/member-has-pending-balance-error'

interface LeaveGroupUseCaseRequest {
    groupId: string
    requestingUserId: string
}

export class LeaveGroupUseCase {

    constructor(
        private groupRepository: GroupRepository,
        private memberRepository: MemberRepository,
        private expenseRepository: ExpenseRepository,
        private settlementRepository: SettlementRepository,
    ) {}

    async execute({ groupId, requestingUserId }: LeaveGroupUseCaseRequest): Promise<void> {
        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new GroupNotFoundError()
        }

        const member = group.members.find(m => m.userId === requestingUserId)
        if (!member) {
            throw new AppError('Você não é membro deste grupo', 403)
        }

        if (!group.canLeave(member.id)) {
            throw new AppError('Você precisa definir um novo owner antes de sair', 400)
        }

        const [expenses, settlements] = await Promise.all([
            this.expenseRepository.findByGroupId(groupId),
            this.settlementRepository.findConfirmedByMemberAndGroup(member.id, groupId),
        ])

        let balance = new Decimal(0)
        for (const expense of expenses) {
            if (expense.payerId === member.userId) {
                balance = balance.plus(expense.amount.toDecimal())
            }
            const share = expense.shares.find(s => s.memberId === member.id)
            if (share) {
                balance = balance.minus(share.amount.toDecimal())
            }
        }
        for (const settlement of settlements) {
            if (settlement.fromMemberId === member.id) {
                balance = balance.plus(settlement.amount.toDecimal())
            } else {
                balance = balance.minus(settlement.amount.toDecimal())
            }
        }

        if (!balance.isZero()) {
            throw new MemberHasPendingBalanceError()
        }

        const isLastMember = group.members.length === 1
        await this.memberRepository.removeMemberGroup(member.id)

        if (isLastMember) {
            await this.groupRepository.delete(groupId)
        }
    }
}
