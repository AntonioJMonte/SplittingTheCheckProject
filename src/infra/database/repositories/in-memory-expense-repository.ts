import Decimal from 'decimal.js'
import { ExpenseRepository, FindManyByGroupParams, FindManyByGroupResult } from '../../../application/repositories/expense-repository'
import { Expense } from '../../../domain/entities/expense'
import { Settlement } from '../../../domain/entities/settlement'

export class InMemoryExpenseRepository implements ExpenseRepository {
    public items: Expense[] = []
    /** userId → memberId mapping; populate in tests to enable share-based view filters */
    public memberIdByUserId: Map<string, string> = new Map()
    /** settlements used by the 'pending' view filter */
    public settlementItems: Settlement[] = []

    async create(data: Expense): Promise<void> {
        this.items.push(data)
    }

    async findById(id: string): Promise<Expense | null> {
        return this.items.find(e => e.id === id) ?? null
    }

    async findByGroupId(groupId: string): Promise<Expense[]> {
        return this.items.filter(e => e.groupId === groupId)
    }

    async findManyByGroup(params: FindManyByGroupParams): Promise<FindManyByGroupResult> {
        const page = params.page ?? 1
        const limit = params.limit ?? 20
        const memberId = this.memberIdByUserId.get(params.userId)

        let results = this.items.filter(e => e.groupId === params.groupId)

        if (params.category !== undefined) {
            results = results.filter(e => e.category === params.category)
        }

        if (params.startDate !== undefined) {
            results = results.filter(e => e.occurredAt >= params.startDate!)
        }

        if (params.endDate !== undefined) {
            results = results.filter(e => e.occurredAt <= params.endDate!)
        }

        if (params.minAmount !== undefined) {
            results = results.filter(e =>
                new Decimal(e.amount.toDecimal()).gte(params.minAmount!),
            )
        }

        if (params.maxAmount !== undefined) {
            results = results.filter(e =>
                new Decimal(e.amount.toDecimal()).lte(params.maxAmount!),
            )
        }

        if (params.view === 'paid') {
            results = results.filter(e => e.payerId === params.userId)
        } else if (params.view === 'involved' && memberId) {
            results = results.filter(e => e.shares.some(s => s.memberId === memberId))
        } else if (params.view === 'pending' && memberId) {
            const hasConfirmedSettlement = this.settlementItems.some(
                s =>
                    s.groupId === params.groupId &&
                    s.status === 'CONFIRMED' &&
                    s.fromMemberId === memberId,
            )
            results = results.filter(
                e =>
                    e.payerId !== params.userId &&
                    e.shares.some(s => s.memberId === memberId) &&
                    !hasConfirmedSettlement,
            )
        }

        results = results.sort(
            (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
        )

        const total = results.length
        const expenses = results.slice((page - 1) * limit, page * limit)

        return { expenses, total }
    }

    async update(data: Expense): Promise<void> {
        const index = this.items.findIndex(e => e.id === data.id)
        if (index !== -1) {
            this.items[index] = data
        }
    }

    async delete(id: string): Promise<void> {
        const index = this.items.findIndex(e => e.id === id)
        if (index !== -1) {
            this.items.splice(index, 1)
        }
    }
}
