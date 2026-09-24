import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RedisRefreshTokenBlacklist } from '../../../../infra/cache/refresh-token-blacklist'
import { sha256Hex } from '../../../../shared/utils/hash-text'

const redis = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock('../../../../infra/redis/redis-client', () => ({
  getRedisClient: () => redis,
}))

describe('RedisRefreshTokenBlacklist', () => {
  let sut: RedisRefreshTokenBlacklist

  beforeEach(() => {
    redis.get.mockReset()
    redis.set.mockReset()
    sut = new RedisRefreshTokenBlacklist()
  })

  it('should store the hash of the token, never the token itself', async () => {
    await sut.revoke('token-secreto', 3600)

    const [key, value, unit, ttl] = redis.set.mock.calls[0]
    expect(key).toBe(`refresh:revogado:${sha256Hex('token-secreto')}`)
    expect(key).toMatch(/^refresh:revogado:[0-9a-f]{64}$/)
    expect(key).not.toContain('token-secreto')
    expect(value).toBe('1')
    expect(unit).toBe('EX')
    expect(ttl).toBe(3600)
  })

  it('should report a token as revoked when the key exists', async () => {
    redis.get.mockResolvedValue('1')

    await expect(sut.isRevoked('token-secreto')).resolves.toBe(true)
    expect(redis.get).toHaveBeenCalledWith(`refresh:revogado:${sha256Hex('token-secreto')}`)
  })

  it('should report a token as valid when the key is absent', async () => {
    redis.get.mockResolvedValue(null)

    await expect(sut.isRevoked('token-secreto')).resolves.toBe(false)
  })

  it('should treat the token as revoked when Redis fails (fail-closed)', async () => {
    redis.get.mockRejectedValue(new Error('Connection is closed'))

    await expect(sut.isRevoked('token-secreto')).resolves.toBe(true)
  })

  it('should propagate a Redis failure on revoke instead of silently succeeding', async () => {
    redis.set.mockRejectedValue(new Error('Connection is closed'))

    await expect(sut.revoke('token-secreto', 3600)).rejects.toThrow('Connection is closed')
  })

  it('should derive the same key for the same token and different keys for different tokens', async () => {
    redis.get.mockResolvedValue(null)

    await sut.isRevoked('token-a')
    await sut.isRevoked('token-a')
    await sut.isRevoked('token-b')

    const [first, second, third] = redis.get.mock.calls.map(call => call[0])
    expect(first).toBe(second)
    expect(third).not.toBe(first)
  })
})
