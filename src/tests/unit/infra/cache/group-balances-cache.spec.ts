import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
    getGroupBalancesCache,
    setGroupBalancesCache,
    invalidateGroupBalancesCache,
    CachedGroupBalances,
} from '../../../../infra/cache/group-balances-cache'

const redis = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }))

vi.mock('../../../../infra/redis/redis-client', () => ({ getRedisClient: () => redis }))

const GROUP_ID = 'g-1'
const KEY = 'grupo:g-1:saldos'
const ONE_DAY_IN_SECONDS = 86400

const balances: CachedGroupBalances = {
    memberBalances: [{ memberId: 'm-1', userId: 'u-1', balance: '-30.00' }],
    transfers: [{ fromMemberId: 'm-1', toMemberId: 'm-2', amount: '30.00' }],
}

describe('group balances cache', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it('should return the cached balances with the amounts as strings, never floats', async () => {
        redis.get.mockResolvedValue(JSON.stringify(balances))

        const cached = await getGroupBalancesCache(GROUP_ID)

        expect(redis.get).toHaveBeenCalledWith(KEY)
        expect(cached).toEqual(balances)
        expect(cached?.transfers[0].amount).toBe('30.00')
    })

    it('should report a miss as null', async () => {
        redis.get.mockResolvedValue(null)

        expect(await getGroupBalancesCache(GROUP_ID)).toBeNull()
    })

    it('should fall back to a miss when Redis fails or the entry is corrupted, so the balances get recomputed', async () => {
        redis.get.mockRejectedValueOnce(new Error('ECONNREFUSED'))
        expect(await getGroupBalancesCache(GROUP_ID)).toBeNull()

        redis.get.mockResolvedValueOnce('{corrompido')
        expect(await getGroupBalancesCache(GROUP_ID)).toBeNull()
    })

    it('should store the balances for one day under the group key', async () => {
        await setGroupBalancesCache(GROUP_ID, balances)

        expect(redis.set).toHaveBeenCalledWith(KEY, JSON.stringify(balances), 'EX', ONE_DAY_IN_SECONDS)
    })

    it('should delete the group key on invalidation', async () => {
        await invalidateGroupBalancesCache(GROUP_ID)

        expect(redis.del).toHaveBeenCalledWith(KEY)
    })

    it('should not fail the request when writing or invalidating the cache fails', async () => {
        redis.set.mockRejectedValue(new Error('ECONNREFUSED'))
        redis.del.mockRejectedValue(new Error('ECONNREFUSED'))

        await expect(setGroupBalancesCache(GROUP_ID, balances)).resolves.toBeUndefined()
        await expect(invalidateGroupBalancesCache(GROUP_ID)).resolves.toBeUndefined()
    })
})
