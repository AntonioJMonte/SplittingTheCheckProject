import { ExpenseRepository } from '../../repositories/expense-repository'
import { MemberRepository } from '../../repositories/member-repository'
import { ExpenseCategorizer } from '../../services/expense-categorizer'
import { Expense } from '../../../domain/entities/expense'
import { ExpenseNotFoundError } from '../../../shared/errors/expense-not-found-error'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'

interface CategorizeExpenseUseCaseRequest {
    expenseId: string
    requestUserId: string
}

interface CategorizeExpenseUseCaseResponse {
    expense: Expense
    updated: boolean
}

export class CategorizeExpenseUseCase {

    constructor(
        private expenseRepository: ExpenseRepository,
        private memberRepository: MemberRepository,
        private expenseCategorizer: ExpenseCategorizer,
    ) {}

    async execute({
        expenseId,
        requestUserId,
    }: CategorizeExpenseUseCaseRequest): Promise<CategorizeExpenseUseCaseResponse> {
        const expense = await this.expenseRepository.findById(expenseId)
        if (!expense) {
            throw new ExpenseNotFoundError()
        }

        const requestingMember = await this.memberRepository.findByUserAndGroup(requestUserId, expense.groupId)
        if (!requestingMember) {
            throw new NotGroupMemberError()
        }

        const category = await this.expenseCategorizer.categorize({
            description: expense.description,
            amount: expense.amount.toString(),
        })

        const updated = await this.expenseRepository.updateCategory(expense.id, category, expense.description)
        if (updated) {
            return { expense: expense.withCategory(category), updated }
        }

        // The description changed while the categorizer was running; that edit owns the category now.
        const current = await this.expenseRepository.findById(expense.id)
        if (!current) {
            throw new ExpenseNotFoundError()
        }

        return { expense: current, updated }
    }
}
