import { describe, it, expect } from 'vitest'
import { applyRules } from '../../../../infra/llm/rules-engine'
import { CATEGORY_KEYWORDS } from '../../../../infra/llm/category-keywords'
import { normalizeText } from '../../../../shared/utils/normalize-text'

describe('applyRules', () => {
  it.each([
    ['Pizza Hut', 'Alimentação'],
    ['Uber para o aeroporto', 'Transporte'],
    ['Netflix', 'Assinaturas'],
    ['Aluguel de março', 'Moradia'],
    ['FARMÁCIA São João', 'Saúde'],
    ['Açaí na praia', 'Alimentação'],
  ])('should categorize "%s" as %s', (description, expected) => {
    expect(applyRules(description)).toBe(expected)
  })

  describe('false positives from substring matching', () => {
    it('should not treat "Uberlândia" as an Uber ride', () => {
      expect(applyRules('Passeio em Uberlândia')).toBeNull()
    })

    it('should not treat "barbearia" as a bar', () => {
      expect(applyRules('Barbearia do Zé')).toBeNull()
    })

    it('should not treat "gasto" as a gas bill', () => {
      expect(applyRules('Gasto geral da casa')).toBeNull()
    })

    it('should not read amounts like "99,90" as the 99 ride app', () => {
      expect(applyRules('Mercado 99,90')).toBe('Alimentação')
      expect(applyRules('Pagamento 99')).toBeNull()
    })

    it('should still recognize the 99 app when written as a phrase', () => {
      expect(applyRules('99 Pop até a rodoviária')).toBe('Transporte')
      expect(applyRules('99pop')).toBe('Transporte')
    })
  })

  describe('conflicts between keywords', () => {
    it('should prefer the longest phrase: "Uber Eats" is food, not transport', () => {
      expect(applyRules('Uber Eats sexta')).toBe('Alimentação')
    })

    it('should prefer "Mercado Livre" (shopping) over "mercado" (food)', () => {
      expect(applyRules('Fone no Mercado Livre')).toBe('Compras')
    })

    it('should prefer "Amazon Prime" (subscription) over "Amazon" (shopping)', () => {
      expect(applyRules('Amazon Prime anual')).toBe('Assinaturas')
      expect(applyRules('Amazon')).toBe('Compras')
    })

    it('should break same-length ties by the earliest keyword in the description', () => {
      expect(applyRules('Uber até o mercado')).toBe('Transporte')
      expect(applyRules('Mercado e depois Uber')).toBe('Alimentação')
    })
  })

  it('should return null for descriptions without keywords, blank text or only punctuation', () => {
    expect(applyRules('Rateio diverso')).toBeNull()
    expect(applyRules('   ')).toBeNull()
    expect(applyRules('!!!')).toBeNull()
  })

  describe('keyword table integrity', () => {
    const entries = Object.entries(CATEGORY_KEYWORDS).flatMap(([category, keywords]) =>
      keywords.map(keyword => ({ category, keyword, normalized: normalizeText(keyword) })),
    )

    it('should not contain purely numeric keywords', () => {
      const numeric = entries.filter(e => /^[0-9 ]+$/.test(e.normalized))
      expect(numeric).toEqual([])
    })

    it('should not contain keywords that normalize to empty text', () => {
      expect(entries.filter(e => e.normalized === '')).toEqual([])
    })

    it('should not map the same normalized keyword to two categories', () => {
      const categoriesByKeyword = new Map<string, Set<string>>()
      for (const { normalized, category } of entries) {
        categoriesByKeyword.set(normalized, (categoriesByKeyword.get(normalized) ?? new Set()).add(category))
      }
      const ambiguous = [...categoriesByKeyword].filter(([, categories]) => categories.size > 1).map(([keyword]) => keyword)
      expect(ambiguous).toEqual([])
    })
  })
})
