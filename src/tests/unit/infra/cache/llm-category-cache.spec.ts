import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buildCategoryCacheKey, getCategoryCache, setCategoryCache } from '../../../../infra/cache/llm-category-cache'

const redis = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }))

vi.mock('../../../../infra/redis/redis-client', () => ({ getRedisClient: () => redis }))

describe('buildCategoryCacheKey', () => {
  it('should map case, spacing and accent variations to the same key', () => {
    const key = buildCategoryCacheKey('Açaí da Praia')

    expect(buildCategoryCacheKey('  acai   DA praia ')).toBe(key)
    expect(buildCategoryCacheKey('Acai-da-praia!')).toBe(key)
  })

  it('should produce different keys for different descriptions', () => {
    expect(buildCategoryCacheKey('Mercado')).not.toBe(buildCategoryCacheKey('Mercado Livre'))
  })

  it('should be versioned, fixed-size and never expose the description', () => {
    const shortKey = buildCategoryCacheKey('Uber')
    const longKey = buildCategoryCacheKey('Uber '.repeat(200))

    expect(shortKey).toMatch(/^categoria:v1:[0-9a-f]{64}$/)
    expect(longKey).toHaveLength(shortKey!.length)
    expect(shortKey!.toLowerCase()).not.toContain('uber')
  })

  it('should return null when the description has no alphanumeric content', () => {
    expect(buildCategoryCacheKey('!!!')).toBeNull()
  })
})

describe('category cache reads and writes', () => {
  const SEVEN_DAYS_IN_SECONDS = 604800

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should read the category stored under the normalized description key', async () => {
    redis.get.mockResolvedValue('Transporte')

    expect(await getCategoryCache('Uber Centro')).toBe('Transporte')
    expect(redis.get).toHaveBeenCalledWith(buildCategoryCacheKey('uber centro'))
  })

  it('should skip Redis entirely when the description has no usable text', async () => {
    expect(await getCategoryCache('!!!')).toBeNull()
    await setCategoryCache('!!!', 'Outros')

    expect(redis.get).not.toHaveBeenCalled()
    expect(redis.set).not.toHaveBeenCalled()
  })

  it('should treat a Redis failure as a miss, so the categorizer moves on to the LLM', async () => {
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'))

    expect(await getCategoryCache('Uber')).toBeNull()
  })

  it('should write for seven days without overwriting an existing answer', async () => {
    await setCategoryCache('Uber', 'Transporte')

    expect(redis.set).toHaveBeenCalledWith(buildCategoryCacheKey('Uber'), 'Transporte', 'EX', SEVEN_DAYS_IN_SECONDS, 'NX')
  })

  it('should not fail the categorization when the write fails', async () => {
    redis.set.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(setCategoryCache('Uber', 'Transporte')).resolves.toBeUndefined()
  })
})
