import { describe, it, expect, beforeEach, vi } from 'vitest'
import { guardDuplicate } from '../../../../infra/websocket/event-dedup'

const redis = vi.hoisted(() => ({ set: vi.fn() }))

vi.mock('../../../../infra/redis/redis-client', () => ({
    getRedisClient: () => redis,
}))

describe('guardDuplicate', () => {
    beforeEach(() => {
        redis.set.mockReset()
    })

    it('should let the first occurrence through', async () => {
        redis.set.mockResolvedValue('OK')

        await expect(guardDuplicate('grupo-1', 'evento-1')).resolves.toBe(false)
    })

    it('should block a repeated event', async () => {
        redis.set.mockResolvedValue(null)

        await expect(guardDuplicate('grupo-1', 'evento-1')).resolves.toBe(true)
    })

    it('should reserve the key with NX and a 60 second TTL', async () => {
        redis.set.mockResolvedValue('OK')

        await guardDuplicate('grupo-1', 'evento-1')

        expect(redis.set).toHaveBeenCalledWith('ws:dedup:grupo-1:evento-1', '1', 'EX', 60, 'NX')
    })

    it('should scope the key by group so the same event id in another group passes', async () => {
        redis.set.mockResolvedValue('OK')

        await guardDuplicate('grupo-1', 'evento-1')
        await guardDuplicate('grupo-2', 'evento-1')

        const keys = redis.set.mock.calls.map(call => call[0])
        expect(keys[0]).not.toBe(keys[1])
    })
})
