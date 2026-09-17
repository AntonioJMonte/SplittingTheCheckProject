import { ExpenseCategory } from '../../domain/value-objects/expense-category'

export interface CategorizationInput {
    description: string
    amount: string
}

export interface ExpenseCategorizer {
    /** Deterministic sources only (rules and cache); resolves to null when they cannot decide. */
    tryQuickCategorize(description: string): Promise<ExpenseCategory | null>
    /** Full pipeline; never rejects and falls back to the default category. */
    categorize(input: CategorizationInput): Promise<ExpenseCategory>
}
