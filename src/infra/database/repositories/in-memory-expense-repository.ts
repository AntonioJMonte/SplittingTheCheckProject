import { ExpenseRepository } from '../../../application/repositories/expense-repository'
import { Expense } from '../../../domain/entities/expense'

export class InMemoryExpenseRepository implements ExpenseRepository {
    public items: Expense[] = []

    async findByGroupId(groupId: string): Promise<Expense[]> {
        return this.items.filter(e => e.groupId === groupId)
    }
}
