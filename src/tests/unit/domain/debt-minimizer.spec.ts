import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { DebtMinimizer, MemberBalance, TransferSuggestion } from '../../../domain/services/debt-minimizer'
import { Money } from '../../../domain/value-objects/money'
import { makeBalance, makeBalances, makeBalancedPairs } from '../../factories/balance-factory'

function totalTransferred(transfers: TransferSuggestion[]): Decimal {
    return transfers.reduce((acc, t) => acc.plus(t.amount.toDecimal()), new Decimal(0))
}

function totalOwed(balances: MemberBalance[]): Decimal {
    return balances
        .filter(b => b.balance.greaterThan(0))
        .reduce((acc, b) => acc.plus(b.balance), new Decimal(0))
}

// Aplica as transferências aos saldos: se o algoritmo está certo, todo mundo termina zerado.
function applyTransfers(balances: MemberBalance[], transfers: TransferSuggestion[]): Map<string, Decimal> {
    const final = new Map(balances.map(b => [b.memberId, b.balance]))
    for (const t of transfers) {
        final.set(t.fromMemberId, final.get(t.fromMemberId)!.plus(t.amount.toDecimal()))
        final.set(t.toMemberId, final.get(t.toMemberId)!.minus(t.amount.toDecimal()))
    }
    return final
}

describe('DebtMinimizer', () => {
    it('should return no transfers for an empty group', () => {
        expect(DebtMinimizer.minimize([])).toEqual([])
    })

    it('should return no transfers when every balance is zero', () => {
        const balances = makeBalances([0, 0, 0])

        expect(DebtMinimizer.minimize(balances)).toHaveLength(0)
    })

    it('should return no transfers for a single member with zero balance', () => {
        expect(DebtMinimizer.minimize([makeBalance('solo', 0)])).toHaveLength(0)
    })

    it('should produce one transfer for a single creditor and debtor of the same value', () => {
        const balances = [makeBalance('creditor', 50), makeBalance('debtor', -50)]

        const transfers = DebtMinimizer.minimize(balances)

        expect(transfers).toHaveLength(1)
        expect(transfers[0].fromMemberId).toBe('debtor')
        expect(transfers[0].toMemberId).toBe('creditor')
        expect(transfers[0].amount.toString()).toBe('50.00')
        expect(transfers[0].amount).toBeInstanceOf(Money)
    })

    it('should settle ties without generating extra transfers', () => {
        // Dois credores e dois devedores, todos com o mesmo valor: o mínimo possível é 2 transferências.
        const balances = makeBalances([30, 30, -30, -30])

        const transfers = DebtMinimizer.minimize(balances)

        expect(transfers).toHaveLength(2)
        expect(transfers.every(t => t.amount.toString() === '30.00')).toBe(true)
        for (const saldo of applyTransfers(balances, transfers).values()) {
            expect(saldo.isZero()).toBe(true)
        }
    })

    it('should not lose a cent on amounts that do not divide evenly', () => {
        // 100,00 devidos por 3 pessoas em partes de 33,34 / 33,33 / 33,33.
        const balances = [
            makeBalance('creditor', '100.00'),
            makeBalance('d1', '-33.34'),
            makeBalance('d2', '-33.33'),
            makeBalance('d3', '-33.33'),
        ]

        const transfers = DebtMinimizer.minimize(balances)

        expect(totalTransferred(transfers).toFixed(2)).toBe('100.00')
        for (const saldo of applyTransfers(balances, transfers).values()) {
            expect(saldo.isZero()).toBe(true)
        }
    })

    it('should handle multiple creditors and debtors', () => {
        const balances = [
            makeBalance('A', 30),
            makeBalance('B', 10),
            makeBalance('C', -20),
            makeBalance('D', -20),
        ]

        const transfers = DebtMinimizer.minimize(balances)

        // Limite do algoritmo guloso: no máximo credores + devedores - 1 transferências.
        expect(transfers.length).toBeLessThanOrEqual(3)
        expect(totalTransferred(transfers).toFixed(2)).toBe('40.00')
        for (const saldo of applyTransfers(balances, transfers).values()) {
            expect(saldo.isZero()).toBe(true)
        }
    })

    it('should transfer exactly the sum of the positive balances', () => {
        const balances = [
            makeBalance('A', '12.50'),
            makeBalance('B', '7.25'),
            makeBalance('C', '-5.75'),
            makeBalance('D', '-14.00'),
        ]

        const transfers = DebtMinimizer.minimize(balances)

        expect(totalTransferred(transfers).equals(totalOwed(balances))).toBe(true)
    })

    it('should settle a group with 50+ members', () => {
        const balances = makeBalancedPairs(30, '19.99')

        const transfers = DebtMinimizer.minimize(balances)

        expect(balances).toHaveLength(60)
        expect(transfers).toHaveLength(30)
        expect(totalTransferred(transfers).toFixed(2)).toBe('599.70')
        for (const saldo of applyTransfers(balances, transfers).values()) {
            expect(saldo.isZero()).toBe(true)
        }
    })

    it('should never suggest a transfer of zero', () => {
        const balances = [
            makeBalance('A', 40),
            makeBalance('B', 0),
            makeBalance('C', -40),
            makeBalance('D', 0),
        ]

        const transfers = DebtMinimizer.minimize(balances)

        expect(transfers).toHaveLength(1)
        expect(transfers.every(t => t.amount.toNumber() > 0)).toBe(true)
    })

    it('should ignore members with zero balance when picking counterparties', () => {
        const balances = [makeBalance('zerado', 0), makeBalance('credor', 15), makeBalance('devedor', -15)]

        const transfers = DebtMinimizer.minimize(balances)

        expect(transfers).toHaveLength(1)
        expect(transfers[0].fromMemberId).toBe('devedor')
        expect(transfers[0].toMemberId).toBe('credor')
    })

    it('should not mutate the balances it receives', () => {
        const balances = [makeBalance('credor', 10), makeBalance('devedor', -10)]

        DebtMinimizer.minimize(balances)

        expect(balances[0].balance.toNumber()).toBe(10)
        expect(balances[1].balance.toNumber()).toBe(-10)
    })

    it('should let the largest debtor pay the largest creditor first', () => {
        const balances = [
            makeBalance('pequeno', 10),
            makeBalance('grande', 100),
            makeBalance('devedor-grande', -80),
            makeBalance('devedor-pequeno', -30),
        ]

        const transfers = DebtMinimizer.minimize(balances)

        expect(transfers[0].toMemberId).toBe('grande')
        expect(transfers[0].fromMemberId).toBe('devedor-grande')
        expect(transfers[0].amount.toString()).toBe('80.00')
    })
})
