import { describe, it, expect } from 'vitest'
import { SplitCalculator } from '../../../domain/services/split-calculator'
import { Money } from '../../../domain/value-objects/money'
import { DomainError } from '../../../shared/errors/domain-error'

function sum(shares: Array<{ amount: Money }>): Money {
    return shares.reduce((acc, share) => acc.add(share.amount), new Money(0))
}

function ids(n: number): string[] {
    return Array.from({ length: n }, (_, i) => `member-${i + 1}`)
}

describe('SplitCalculator.equally', () => {
    it('should split evenly when the amount divides exactly', () => {
        const shares = SplitCalculator.equally(new Money('100.00'), ids(2))

        expect(shares.map(s => s.amount.toString())).toEqual(['50.00', '50.00'])
        expect(sum(shares).toString()).toBe('100.00')
    })

    it('should keep the sum exact when the amount does not divide (100 / 3)', () => {
        const shares = SplitCalculator.equally(new Money('100.00'), ids(3))

        expect(shares.map(s => s.amount.toString())).toEqual(['33.34', '33.33', '33.33'])
        expect(sum(shares).toString()).toBe('100.00')
    })

    it('should give the leftover cents to the first shares, in the received order', () => {
        const shares = SplitCalculator.equally(new Money('10.00'), ids(3))

        expect(shares.map(s => s.amount.toString())).toEqual(['3.34', '3.33', '3.33'])
        expect(shares[0].memberId).toBe('member-1')
        expect(sum(shares).toString()).toBe('10.00')
    })

    it('should never create a cent out of nothing (0.05 between 2)', () => {
        const shares = SplitCalculator.equally(new Money('0.05'), ids(2))

        expect(shares.map(s => s.amount.toString())).toEqual(['0.03', '0.02'])
        expect(sum(shares).toString()).toBe('0.05')
    })

    it('should handle an amount smaller than one cent per member', () => {
        const shares = SplitCalculator.equally(new Money('0.01'), ids(3))

        expect(shares.map(s => s.amount.toString())).toEqual(['0.01', '0.00', '0.00'])
        expect(sum(shares).toString()).toBe('0.01')
    })

    it('should keep the sum exact for a hard case (99.99 between 7)', () => {
        const shares = SplitCalculator.equally(new Money('99.99'), ids(7))

        expect(sum(shares).toString()).toBe('99.99')
        expect(shares).toHaveLength(7)
    })

    it('should keep the sum exact for every member count from 1 to 40', () => {
        for (let n = 1; n <= 40; n++) {
            const shares = SplitCalculator.equally(new Money('100.00'), ids(n))
            expect(sum(shares).toString(), `falhou com ${n} membros`).toBe('100.00')
            expect(shares).toHaveLength(n)
        }
    })

    it('should never spread the shares by more than one cent', () => {
        const shares = SplitCalculator.equally(new Money('100.00'), ids(7))
        const values = shares.map(s => s.amount.toNumber())

        expect(Math.max(...values) - Math.min(...values)).toBeCloseTo(0.01, 10)
    })

    it('should give everything to a single member', () => {
        const shares = SplitCalculator.equally(new Money('77.77'), ids(1))

        expect(shares[0].amount.toString()).toBe('77.77')
    })

    it('should reject an empty member list', () => {
        expect(() => SplitCalculator.equally(new Money('10.00'), [])).toThrow(DomainError)
    })

    it('should split zero into zeros', () => {
        const shares = SplitCalculator.equally(new Money('0'), ids(3))

        expect(shares.map(s => s.amount.toString())).toEqual(['0.00', '0.00', '0.00'])
    })
})

describe('SplitCalculator.byPercentage', () => {
    it('should split by the given percentages', () => {
        const shares = SplitCalculator.byPercentage(new Money('200.00'), [
            { memberId: 'a', percentage: 25 },
            { memberId: 'b', percentage: 75 },
        ])

        expect(shares.map(s => s.amount.toString())).toEqual(['50.00', '150.00'])
        expect(sum(shares).toString()).toBe('200.00')
    })

    it('should keep the sum exact when percentages produce fractions of a cent', () => {
        const shares = SplitCalculator.byPercentage(new Money('100.00'), [
            { memberId: 'a', percentage: 33.33 },
            { memberId: 'b', percentage: 33.33 },
            { memberId: 'c', percentage: 33.34 },
        ])

        expect(sum(shares).toString()).toBe('100.00')
    })

    it('should reject percentages that do not add up to 100', () => {
        expect(() =>
            SplitCalculator.byPercentage(new Money('100.00'), [
                { memberId: 'a', percentage: 33.33 },
                { memberId: 'b', percentage: 33.33 },
                { memberId: 'c', percentage: 33.33 },
            ]),
        ).toThrow(DomainError)
    })

    it('should reject an empty share list', () => {
        expect(() => SplitCalculator.byPercentage(new Money('10.00'), [])).toThrow(DomainError)
    })
})
