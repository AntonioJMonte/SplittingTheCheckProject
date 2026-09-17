import { getRedisClient } from '../redis/redis-client'
import { normalizeText } from '../../shared/utils/normalize-text'
import { sha256Hex } from '../../shared/utils/hash-text'

const CATEGORY_TTL = 604800 // 7 dias
// Bump when the prompt or the category list changes so stale answers stop being served.
const CACHE_VERSION = 'v1'

export function buildCategoryCacheKey(description: string): string | null {
    const normalized = normalizeText(description)
    if (!normalized) return null

    return `categoria:${CACHE_VERSION}:${sha256Hex(normalized)}`
}

export async function getCategoryCache(description: string): Promise<string | null> {
    const key = buildCategoryCacheKey(description)
    if (!key) return null

    try {
        return await getRedisClient().get(key)
    } catch {
        return null
    }
}

export async function setCategoryCache(description: string, category: string): Promise<void> {
    const key = buildCategoryCacheKey(description)
    if (!key) return

    try {
        await getRedisClient().set(key, category, 'EX', CATEGORY_TTL, 'NX')
    } catch {
        // falha de escrita em cache não é crítica
    }
}
