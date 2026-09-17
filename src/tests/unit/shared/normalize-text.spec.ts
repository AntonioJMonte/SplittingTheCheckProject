import { describe, it, expect } from 'vitest'
import { normalizeText } from '../../../shared/utils/normalize-text'

describe('normalizeText', () => {
  it('should lowercase and strip accents', () => {
    expect(normalizeText('FARMÁCIA Açaí Pão')).toBe('farmacia acai pao')
  })

  it('should turn punctuation into single spaces and trim', () => {
    expect(normalizeText('  Uber -> aeroporto,  R$ 45,90!  ')).toBe('uber aeroporto r 45 90')
  })

  it('should return an empty string when nothing alphanumeric remains', () => {
    expect(normalizeText(' !!! ... ')).toBe('')
  })
})
