export const EXPENSE_CATEGORIES = [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Lazer',
    'Assinaturas',
    'Saúde',
    'Compras',
    'Outros',
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = 'Outros'

export function isExpenseCategory(value: string): value is ExpenseCategory {
    return (EXPENSE_CATEGORIES as readonly string[]).includes(value)
}
