import Decimal from 'decimal.js'
import { Expense } from '../../domain/entities/expense'
import { ExpenseCategory } from '../../domain/value-objects/expense-category'

export type ExpenseView = 'involved' | 'paid' | 'pending'

export interface FindManyByGroupParams {
    groupId: string
    userId: string
    category?: ExpenseCategory
    startDate?: Date
    endDate?: Date
    minAmount?: Decimal
    maxAmount?: Decimal
    view?: ExpenseView
    page?: number
    limit?: number
}

export interface FindManyByGroupResult {
    expenses: Expense[]
    total: number
}

export interface ExpenseRepository {
    create(data: Expense): Promise<void>
    findById(id: string): Promise<Expense | null>
    findByGroupId(groupId: string): Promise<Expense[]>
    findManyByGroup(params: FindManyByGroupParams): Promise<FindManyByGroupResult>
    update(data: Expense): Promise<void>
    /** Writes only when the stored description still equals `expectedDescription`; resolves to whether it wrote. */
    updateCategory(id: string, category: ExpenseCategory, expectedDescription: string): Promise<boolean>
    delete(id: string): Promise<void>
}
