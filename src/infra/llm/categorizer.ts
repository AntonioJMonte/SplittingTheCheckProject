import { z } from 'zod'
import { CategorizationInput, ExpenseCategorizer } from '../../application/services/expense-categorizer'
import {
    DEFAULT_EXPENSE_CATEGORY,
    EXPENSE_CATEGORIES,
    ExpenseCategory,
    isExpenseCategory,
} from '../../domain/value-objects/expense-category'
import { normalizeText } from '../../shared/utils/normalize-text'
import { sha256Hex } from '../../shared/utils/hash-text'
import { logger } from '../logger/logger'
import { LlmClient } from './anthropic-client'
import { applyRules } from './rules-engine'
import { CATEGORIZE_EXPENSE_SYSTEM_PROMPT, buildCategorizeExpensePrompt } from './prompts/categorize-expense'

export interface CategoryCache {
    get(description: string): Promise<string | null>
    set(description: string, category: ExpenseCategory): Promise<void>
}

type CategorizationSource = 'rule' | 'cache' | 'llm' | 'fallback'

type FallbackReason = 'empty-description' | 'no-llm-client' | 'invalid-output' | 'llm-error'

interface QuickResult {
    category: ExpenseCategory
    source: Extract<CategorizationSource, 'rule' | 'cache'>
}

export const categorizationOutputSchema = z.object({
    category: z.enum(EXPENSE_CATEGORIES),
})

export class LlmExpenseCategorizer implements ExpenseCategorizer {

    constructor(
        private readonly llmClient: LlmClient | null,
        private readonly cache: CategoryCache,
    ) {}

    async tryQuickCategorize(description: string): Promise<ExpenseCategory | null> {
        const quick = await this.resolveQuickly(description)
        if (!quick) return null

        this.logOutcome(description, quick.source, quick.category)
        return quick.category
    }

    async categorize({ description, amount }: CategorizationInput): Promise<ExpenseCategory> {
        const quick = await this.resolveQuickly(description)
        if (quick) {
            this.logOutcome(description, quick.source, quick.category)
            return quick.category
        }

        if (!normalizeText(description)) return this.fallback(description, 'empty-description')
        if (!this.llmClient) return this.fallback(description, 'no-llm-client')

        try {
            const output = await this.llmClient.completeStructured({
                operation: 'categorize-expense',
                system: CATEGORIZE_EXPENSE_SYSTEM_PROMPT,
                prompt: buildCategorizeExpensePrompt(description, amount),
                schema: categorizationOutputSchema,
            })

            const parsed = categorizationOutputSchema.safeParse(output)
            if (!parsed.success) return this.fallback(description, 'invalid-output')

            await this.cache.set(description, parsed.data.category)
            this.logOutcome(description, 'llm', parsed.data.category)
            return parsed.data.category
        } catch {
            return this.fallback(description, 'llm-error')
        }
    }

    private async resolveQuickly(description: string): Promise<QuickResult | null> {
        try {
            const fromRules = applyRules(description)
            if (fromRules) return { category: fromRules, source: 'rule' }

            const cached = await this.cache.get(description)
            if (cached && isExpenseCategory(cached)) return { category: cached, source: 'cache' }

            return null
        } catch {
            return null
        }
    }

    private fallback(description: string, reason: FallbackReason): ExpenseCategory {
        this.logOutcome(description, 'fallback', DEFAULT_EXPENSE_CATEGORY, reason)
        return DEFAULT_EXPENSE_CATEGORY
    }

    private logOutcome(
        description: string,
        source: CategorizationSource,
        category: ExpenseCategory,
        fallbackReason?: FallbackReason,
    ): void {
        const level = source === 'rule' || source === 'cache' ? 'debug' : 'info'
        logger[level]({
            source,
            category,
            fallbackReason,
            descriptionHash: sha256Hex(normalizeText(description)).slice(0, 12),
        }, 'Despesa categorizada')
    }
}
