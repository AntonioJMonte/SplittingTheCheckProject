import { ExpenseRepository } from '../../repositories/expense-repository'
import { MemberRepository } from '../../repositories/member-repository'
import { ExpenseNotFoundError } from '../../../shared/errors/expense-not-found-error'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'
import { UnauthorizedError } from '../../../shared/errors/unauthorized-error'

interface DeleteExpenseUseCaseRequest {
    expenseId: string
    requestUserId: string
}

export class DeleteExpenseUseCase {

    constructor(
        private expenseRepository: ExpenseRepository,
        private memberRepository: MemberRepository,
    ) {}

    async execute({ expenseId, requestUserId }: DeleteExpenseUseCaseRequest): Promise<{ groupId: string }> {
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

        await this.expenseRepository.delete(expenseId)
        return { groupId: expense.groupId }
    }
}
