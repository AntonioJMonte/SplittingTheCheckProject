import { ExpenseRepository } from '../../repositories/expense-repository'
import { MemberRepository } from '../../repositories/member-repository'
import { GroupRepository } from '../../repositories/group-repository'
import { SettlementRepository } from '../../repositories/settlement-repository'
import { Expense } from '../../../domain/entities/expense'
import { Money } from '../../../domain/value-objects/money'
import { SplitMethodType } from '../../../domain/value-objects/split-method'
import { ExpenseNotFoundError } from '../../../shared/errors/expense-not-found-error'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'
import { UnauthorizedError } from '../../../shared/errors/unauthorized-error'
import { MemberNotInGroupError } from '../../../shared/errors/member-not-in-group-error'

interface ShareInput {
    memberId: string
    amount: string
}

interface UpdateExpenseUseCaseRequest {
    expenseId: string
    requestUserId: string
    description?: string
    amount?: string
    splitMethod?: SplitMethodType
    shares?: ShareInput[]
}

interface UpdateExpenseUseCaseResponse {
    expense: Expense
}

export class UpdateExpenseUseCase {

    constructor(
        private expenseRepository: ExpenseRepository,
        private memberRepository: MemberRepository,
        private groupRepository: GroupRepository,
        private settlementRepository: SettlementRepository,
    ) {}

    async execute({
        expenseId,
        requestUserId,
        description,
        amount,
        splitMethod,
        shares,
    }: UpdateExpenseUseCaseRequest): Promise<UpdateExpenseUseCaseResponse> {
        const expense = await this.expenseRepository.findById(expenseId)
        if (!expense) {
            throw new ExpenseNotFoundError()
        }

        const requestingMember = await this.memberRepository.findByUserAndGroup(requestUserId, expense.groupId)
        if (!requestingMember) {
            throw new NotGroupMemberError()
        }

        const isPayer = expense.payerId === requestUserId
        const isOwner = requestingMember.isOwner()
        if (!isPayer && !isOwner) {
            throw new UnauthorizedError()
        }

        if (shares !== undefined) {
            const group = await this.groupRepository.findById(expense.groupId)
            const groupMemberIds = new Set(group!.members.map(m => m.id))
            for (const share of shares) {
                if (!groupMemberIds.has(share.memberId)) {
                    throw new MemberNotInGroupError(share.memberId)
                }
            }
        }

        const updatedExpense = expense.update({
            description,
            amount: amount !== undefined ? new Money(amount) : undefined,
            splitMethod,
            shareInputs: shares?.map(s => ({ memberId: s.memberId, amount: new Money(s.amount) })),
        })

        await this.expenseRepository.update(updatedExpense)
        await this.settlementRepository.cancelPendingByGroupId(expense.groupId)

        return { expense: updatedExpense }
    }
}
