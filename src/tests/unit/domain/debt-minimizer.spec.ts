import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { DebtMinimizer, MemberBalance } from '../../../domain/services/debt-minimizer'
import { Money } from '../../../domain/value-objects/money'

function balance(memberId: string, amount: number): MemberBalance {
    return { memberId, balance: new Decimal(amount) }
}

describe('DebtMinimizer', () => {
    it('should return no transfers when all balances are zero', () => {
        const result = DebtMinimizer.minimize([balance('a', 0), balance('b', 0)])
        expect(result).toHaveLength(0)
    })

    it('should produce a single transfer for one creditor and one debtor', () => {
        const result = DebtMinimizer.minimize([balance('creditor', 50), balance('debtor', -50)])
        expect(result).toHaveLength(1)
        expect(result[0].fromMemberId).toBe('debtor')
        expect(result[0].toMemberId).toBe('creditor')
        expect(result[0].amount.toNumber()).toBe(50)
    })

    it('should split when one creditor is owed by two debtors', () => {
        const result = DebtMinimizer.minimize([
            balance('A', 20),
            balance('B', -10),
            balance('C', -10),
        ])
        expect(result).toHaveLength(2)
        const total = result.reduce((sum, t) => sum + t.amount.toNumber(), 0)
        expect(total).toBe(20)
    })

    it('should minimise transfers in a complex scenario', () => {
        const result = DebtMinimizer.minimize([
            balance('A', 30),
            balance('B', 10),
            balance('C', -20),
            balance('D', -20),
        ])
        expect(result.length).toBeLessThanOrEqual(3)
        const total = result.reduce((sum, t) => sum + t.amount.toNumber(), 0)
        expect(total).toBe(40)
    })

    it('should return Money instances for transfer amounts', () => {
        const result = DebtMinimizer.minimize([balance('creditor', 100), balance('debtor', -100)])
        expect(result[0].amount).toBeInstanceOf(Money)
    })

    it('should return empty array when only one member with zero balance', () => {
        const result = DebtMinimizer.minimize([balance('solo', 0)])
        expect(result).toHaveLength(0)
    })
})
