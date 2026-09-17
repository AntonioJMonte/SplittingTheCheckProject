import { describe, it, expect } from 'vitest'
import { buildCategoryCacheKey } from '../../../../infra/cache/llm-category-cache'

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
