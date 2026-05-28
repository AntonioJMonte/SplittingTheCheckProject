import { getRedisClient } from '../redis/redis-client'

const CATEGORY_TTL = 604800 // 7 dias

export async function getCategoryCache(description: string): Promise<string | null> {
    try {
        return await getRedisClient().get(`categoria:${description}`)
    } catch {
        return null
    }
}

export async function setCategoryCache(description: string, category: string): Promise<void> {
    try {
        await getRedisClient().set(`categoria:${description}`, category, 'EX', CATEGORY_TTL, 'NX')
    } catch {
        // falha de escrita em cache não é crítica
    }
}
