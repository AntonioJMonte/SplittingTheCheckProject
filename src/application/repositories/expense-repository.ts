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
    /**
     * D-82: grava só quando a versão armazenada ainda é a que `data.version` carrega, e
     * incrementa. Resolve para false em conflito. D-80: na mesma transação, guarda o estado
     * anterior como revisão, para a edição não sumir do histórico.
     */
    updateWithRevision(data: Expense, previous: Expense, editedByUserId: string): Promise<boolean>
    /** Writes only when the stored description still equals `expectedDescription`; resolves to whether it wrote. */
    updateCategory(id: string, category: ExpenseCategory, expectedDescription: string): Promise<boolean>
    /** D-72: exclusão lógica — a despesa some das leituras mas permanece, com quem a removeu. */
    softDelete(id: string, deletedByUserId: string): Promise<void>
}
