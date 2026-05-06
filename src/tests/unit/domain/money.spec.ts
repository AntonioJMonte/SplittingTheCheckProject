import { describe, it, expect } from 'vitest'
import { Money } from '../../../domain/value-objects/money'
import { DomainError } from '../../../shared/errors/domain-error'

describe('Money VO', () => {
    it('should create money with a valid positive value', () => {
        const m = new Money(10.5)
        expect(m.toNumber()).toBe(10.5)
    })

    it('should accept zero', () => {
        const m = new Money(0)
        expect(m.toNumber()).toBe(0)
    })

    it('should throw DomainError for negative value', () => {
        expect(() => new Money(-1)).toThrowError(DomainError)
    })

    it('should round to 2 decimal places on construction', () => {
        const m = new Money('10.999')
        expect(m.toString()).toBe('11.00')
    })

    it('add should return correct sum', () => {
        expect(new Money(10).add(new Money(5)).toNumber()).toBe(15)
    })

    it('subtract should return correct difference', () => {
        expect(new Money(10).subtract(new Money(3)).toNumber()).toBe(7)
    })

    it('subtract should throw DomainError when result would be negative', () => {
        expect(() => new Money(3).subtract(new Money(10))).toThrowError(DomainError)
    })

    it('equals should return true for equal values', () => {
        expect(new Money(10).equals(new Money(10))).toBe(true)
    })

    it('equals should return false for different values', () => {
        expect(new Money(10).equals(new Money(11))).toBe(false)
    })

    it('isGreaterThan should return correct comparison', () => {
        expect(new Money(10).isGreaterThan(new Money(5))).toBe(true)
        expect(new Money(5).isGreaterThan(new Money(10))).toBe(false)
    })

    it('toString should format to 2 decimal places', () => {
        expect(new Money(10).toString()).toBe('10.00')
    })
})
