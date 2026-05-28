import { getRedisClient } from '../redis/redis-client'

const DEDUP_TTL_SECONDS = 60

export async function guardDuplicate(groupId: string, eventId: string): Promise<boolean> {
    const key = `ws:dedup:${groupId}:${eventId}`
    const result = await getRedisClient().set(key, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')
    return result === null
}
