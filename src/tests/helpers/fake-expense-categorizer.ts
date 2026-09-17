import { CategorizationInput, ExpenseCategorizer } from '../../application/services/expense-categorizer'
import { ExpenseCategory } from '../../domain/value-objects/expense-category'

export class FakeExpenseCategorizer implements ExpenseCategorizer {
    public quickResults = new Map<string, ExpenseCategory>()
    public fullResult: ExpenseCategory = 'Outros'
    public quickCalls: string[] = []
    public fullCalls: CategorizationInput[] = []
    public beforeCategorizeResolves?: () => Promise<void>

    async tryQuickCategorize(description: string): Promise<ExpenseCategory | null> {
        this.quickCalls.push(description)
        return this.quickResults.get(description) ?? null
    }

    async categorize(input: CategorizationInput): Promise<ExpenseCategory> {
        this.fullCalls.push(input)
        await this.beforeCategorizeResolves?.()
        return this.fullResult
    }
}
