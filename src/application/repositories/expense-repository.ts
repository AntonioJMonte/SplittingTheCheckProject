import { Expense } from '../../domain/entities/expense'

export interface ExpenseRepository {
    findByGroupId(groupId: string): Promise<Expense[]>
}
