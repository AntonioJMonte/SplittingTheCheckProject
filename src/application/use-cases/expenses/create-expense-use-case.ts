import { GroupRepository } from '../../repositories/group-repository'
import { ExpenseRepository } from '../../repositories/expense-repository'
import { ExpenseCategorizer } from '../../services/expense-categorizer'
import { Expense } from '../../../domain/entities/expense'
import { Money } from '../../../domain/value-objects/money'
import { SplitMethodType } from '../../../domain/value-objects/split-method'
import { ExpenseCategory } from '../../../domain/value-objects/expense-category'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { PayerNotMemberError } from '../../../shared/errors/payer-not-member-error'
import { MemberNotInGroupError } from '../../../shared/errors/member-not-in-group-error'

interface ShareInput {
    memberId: string
    amount: string
}

interface CreateExpenseUseCaseRequest {
    groupId: string
    payerUserId: string
    description: string
    amount: string
    shareInputs: ShareInput[]
    splitMethod: SplitMethodType
    occurredAt?: Date
    category?: ExpenseCategory
}

interface CreateExpenseUseCaseResponse {
    expense: Expense
    pendingCategorization: boolean
}

export class CreateExpenseUseCase {

    constructor(
        private groupRepository: GroupRepository,
        private expenseRepository: ExpenseRepository,
        private expenseCategorizer: ExpenseCategorizer,
    ) {}

    async execute({
        groupId,
        payerUserId,
        description,
        amount,
        shareInputs,
        splitMethod,
        occurredAt,
        category,
    }: CreateExpenseUseCaseRequest): Promise<CreateExpenseUseCaseResponse> {
        const group = await this.groupRepository.findById(groupId)
        if (!group) {
            throw new GroupNotFoundError()
        }

        const payerMember = group.members.find(m => m.userId === payerUserId)
        if (!payerMember) {
            throw new PayerNotMemberError()
        }

        const groupMemberIds = new Set(group.members.map(m => m.id))
        for (const share of shareInputs) {
            if (!groupMemberIds.has(share.memberId)) {
                throw new MemberNotInGroupError(share.memberId)
            }
        }

        const resolvedCategory = category ?? await this.expenseCategorizer.tryQuickCategorize(description)

        const expense = Expense.create({
            groupId,
            payerId: payerUserId,
            description,
            amount: new Money(amount),
            shareInputs: shareInputs.map(s => ({ memberId: s.memberId, amount: new Money(s.amount) })),
            splitMethod,
            occurredAt,
            category: resolvedCategory ?? undefined,
        })

        await this.expenseRepository.create(expense)

        return { expense, pendingCategorization: resolvedCategory === null }
    }
}
