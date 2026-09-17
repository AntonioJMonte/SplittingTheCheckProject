import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CategoryCache, LlmExpenseCategorizer } from '../../../../infra/llm/categorizer'
import { LlmClient, StructuredCompletionRequest } from '../../../../infra/llm/anthropic-client'
import { ExpenseCategory } from '../../../../domain/value-objects/expense-category'

class InMemoryCategoryCache implements CategoryCache {
  public entries = new Map<string, string>()
  public getCalls = 0

  async get(description: string): Promise<string | null> {
    this.getCalls++
    return this.entries.get(description) ?? null
  }

  async set(description: string, category: ExpenseCategory): Promise<void> {
    this.entries.set(description, category)
  }
}

function makeLlmClient(implementation: (request: StructuredCompletionRequest<unknown>) => Promise<unknown>) {
  const completeStructured = vi.fn(implementation)
  return { client: { completeStructured } as unknown as LlmClient, completeStructured }
}

describe('LlmExpenseCategorizer', () => {
  let cache: InMemoryCategoryCache

  beforeEach(() => {
    cache = new InMemoryCategoryCache()
  })

  describe('categorize', () => {
    it('should resolve by rules without touching cache or LLM', async () => {
      const { client, completeStructured } = makeLlmClient(async () => ({ category: 'Lazer' }))
      const sut = new LlmExpenseCategorizer(client, cache)

      const category = await sut.categorize({ description: 'Pizza Hut', amount: '80.00' })

      expect(category).toBe('Alimentação')
      expect(cache.getCalls).toBe(0)
      expect(completeStructured).not.toHaveBeenCalled()
    })

    it('should serve a cache hit without calling the LLM', async () => {
      cache.entries.set('Rateio da chácara', 'Lazer')
      const { client, completeStructured } = makeLlmClient(async () => ({ category: 'Compras' }))
      const sut = new LlmExpenseCategorizer(client, cache)

      const category = await sut.categorize({ description: 'Rateio da chácara', amount: '300.00' })

      expect(category).toBe('Lazer')
      expect(completeStructured).not.toHaveBeenCalled()
    })

    it('should ignore a cached value outside the category list and ask the LLM', async () => {
      cache.entries.set('Rateio da chácara', 'Comida')
      const { client, completeStructured } = makeLlmClient(async () => ({ category: 'Lazer' }))
      const sut = new LlmExpenseCategorizer(client, cache)

      const category = await sut.categorize({ description: 'Rateio da chácara', amount: '300.00' })

      expect(category).toBe('Lazer')
      expect(completeStructured).toHaveBeenCalledOnce()
    })

    it('should return and cache a valid LLM category, sending description and amount in the prompt', async () => {
      const { client, completeStructured } = makeLlmClient(async () => ({ category: 'Lazer' }))
      const sut = new LlmExpenseCategorizer(client, cache)

      const category = await sut.categorize({ description: 'Rateio da chácara', amount: '300.00' })

      expect(category).toBe('Lazer')
      expect(cache.entries.get('Rateio da chácara')).toBe('Lazer')
      const request = completeStructured.mock.calls[0][0]
      expect(request.prompt).toContain('Rateio da chácara')
      expect(request.prompt).toContain('R$ 300,00')
    })

    it.each([
      ['a category outside the list', { category: 'Comida' }],
      ['JSON without the category field', { categoria: 'Lazer' }],
      ['a non-object payload', 'Lazer'],
      ['null (refusal, max_tokens or unparseable JSON)', null],
    ])('should fall back to "Outros" and not cache when the LLM returns %s', async (_label, output) => {
      const { client } = makeLlmClient(async () => output)
      const sut = new LlmExpenseCategorizer(client, cache)

      const category = await sut.categorize({ description: 'Rateio da chácara', amount: '300.00' })

      expect(category).toBe('Outros')
      expect(cache.entries.size).toBe(0)
    })

    it('should fall back to "Outros" without caching when the API errors or times out', async () => {
      const { client } = makeLlmClient(async () => {
        throw Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError' })
      })
      const sut = new LlmExpenseCategorizer(client, cache)

      await expect(sut.categorize({ description: 'Rateio da chácara', amount: '300.00' })).resolves.toBe('Outros')
      expect(cache.entries.size).toBe(0)
    })

    it('should fall back to "Outros" when there is no API key (no LLM client)', async () => {
      const sut = new LlmExpenseCategorizer(null, cache)

      await expect(sut.categorize({ description: 'Rateio da chácara', amount: '300.00' })).resolves.toBe('Outros')
    })

    it('should not spend an LLM call on a description without alphanumeric content', async () => {
      const { client, completeStructured } = makeLlmClient(async () => ({ category: 'Lazer' }))
      const sut = new LlmExpenseCategorizer(client, cache)

      await expect(sut.categorize({ description: '!!!', amount: '10.00' })).resolves.toBe('Outros')
      expect(completeStructured).not.toHaveBeenCalled()
    })

    it('should still reach the LLM when the cache itself throws', async () => {
      const brokenCache: CategoryCache = {
        get: async () => { throw new Error('ECONNREFUSED') },
        set: async () => {},
      }
      const { client } = makeLlmClient(async () => ({ category: 'Lazer' }))
      const sut = new LlmExpenseCategorizer(client, brokenCache)

      await expect(sut.categorize({ description: 'Rateio da chácara', amount: '300.00' })).resolves.toBe('Lazer')
    })
  })

  describe('tryQuickCategorize', () => {
    it('should use rules first, then cache, and never the LLM', async () => {
      cache.entries.set('Rateio da chácara', 'Lazer')
      const { client, completeStructured } = makeLlmClient(async () => ({ category: 'Compras' }))
      const sut = new LlmExpenseCategorizer(client, cache)

      await expect(sut.tryQuickCategorize('Uber Eats')).resolves.toBe('Alimentação')
      await expect(sut.tryQuickCategorize('Rateio da chácara')).resolves.toBe('Lazer')
      await expect(sut.tryQuickCategorize('Algo inédito')).resolves.toBeNull()
      expect(completeStructured).not.toHaveBeenCalled()
    })
  })
})
