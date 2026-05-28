import { getRedisClient } from '../redis/redis-client'

const BALANCES_TTL = 86400

export interface CachedGroupBalances {
    memberBalances: Array<{ memberId: string; userId: string; balance: string }>
    transfers: Array<{ fromMemberId: string; toMemberId: string; amount: string }>
}

export async function getGroupBalancesCache(groupId: string): Promise<CachedGroupBalances | null> {
    try {
        const raw = await getRedisClient().get(`grupo:${groupId}:saldos`)
        if (!raw) return null
        return JSON.parse(raw) as CachedGroupBalances
    } catch {
        return null
    }
}

export async function setGroupBalancesCache(groupId: string, data: CachedGroupBalances): Promise<void> {
    try {
        await getRedisClient().set(`grupo:${groupId}:saldos`, JSON.stringify(data), 'EX', BALANCES_TTL)
    } catch {
        // falha de escrita em cache não é crítica
    }
}

export async function invalidateGroupBalancesCache(groupId: string): Promise<void> {
    try {
        await getRedisClient().del(`grupo:${groupId}:saldos`)
    } catch {
        // falha de invalidação não é crítica
    }
}
