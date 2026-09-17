import { ExpenseCategory } from '../../domain/value-objects/expense-category'
import { normalizeText } from '../../shared/utils/normalize-text'
import { CATEGORY_KEYWORDS } from './category-keywords'

interface KeywordRule {
    tokens: string[]
    category: ExpenseCategory
}

interface RuleMatch {
    rule: KeywordRule
    position: number
}

const RULES: KeywordRule[] = Object.entries(CATEGORY_KEYWORDS).flatMap(([category, keywords]) =>
    keywords.map(keyword => ({
        tokens: tokenize(keyword),
        category: category as ExpenseCategory,
    })),
)

function tokenize(value: string): string[] {
    const normalized = normalizeText(value)
    return normalized ? normalized.split(' ') : []
}

function findPhrase(descriptionTokens: string[], phraseTokens: string[]): number {
    const lastStart = descriptionTokens.length - phraseTokens.length
    for (let start = 0; start <= lastStart; start++) {
        if (phraseTokens.every((token, offset) => descriptionTokens[start + offset] === token)) {
            return start
        }
    }
    return -1
}

function isBetterMatch(candidate: RuleMatch, current: RuleMatch | null): boolean {
    if (!current) return true
    if (candidate.rule.tokens.length !== current.rule.tokens.length) {
        return candidate.rule.tokens.length > current.rule.tokens.length
    }
    return candidate.position < current.position
}

// Longest phrase wins ("uber eats" beats "uber"); ties go to the earliest phrase in the description.
export function applyRules(description: string): ExpenseCategory | null {
    const descriptionTokens = tokenize(description)
    if (descriptionTokens.length === 0) return null

    let best: RuleMatch | null = null
    for (const rule of RULES) {
        const position = findPhrase(descriptionTokens, rule.tokens)
        if (position === -1) continue

        const candidate = { rule, position }
        if (isBetterMatch(candidate, best)) {
            best = candidate
        }
    }

    return best?.rule.category ?? null
}
