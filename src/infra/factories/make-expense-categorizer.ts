import { LlmExpenseCategorizer } from '../llm/categorizer'
import { getLlmClient } from '../llm/anthropic-client'
import { getCategoryCache, setCategoryCache } from '../cache/llm-category-cache'

export function makeExpenseCategorizer() {
    return new LlmExpenseCategorizer(getLlmClient(), {
        get: getCategoryCache,
        set: setCategoryCache,
    })
}
