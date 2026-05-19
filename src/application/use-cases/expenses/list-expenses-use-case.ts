import Decimal from 'decimal.js'
import { ExpenseRepository, ExpenseView, FindManyByGroupResult } from '../../repositories/expense-repository'
import { MemberRepository } from '../../repositories/member-repository'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'

interface ListExpensesUseCaseRequest {
    groupId: string
    requestUserId: string
    filters?: {
        category?: string
        startDate?: Date
        endDate?: Date
        minAmount?: Decimal
        maxAmount?: Decimal
        view?: ExpenseView
        page?: number
        limit?: number
    }
}

export class ListExpensesUseCase {

    constructor(
        private expenseRepository: ExpenseRepository,
        private memberRepository: MemberRepository,
    ) {}

    async execute({ groupId, requestUserId, filters }: ListExpensesUseCaseRequest): Promise<FindManyByGroupResult> {
        const member = await this.memberRepository.findByUserAndGroup(requestUserId, groupId)
        if (!member) {
            throw new NotGroupMemberError()
        }

        return this.expenseRepository.findManyByGroup({
            groupId,
            userId: requestUserId,
            ...filters,
        })
    }
}
