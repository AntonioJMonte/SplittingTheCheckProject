import { describe, it, expect } from 'vitest'
import { Expense } from '../../../domain/entities/expense'
import { Money } from '../../../domain/value-objects/money'
import { SplitMethod } from '../../../domain/value-objects/split-method'
import { DomainError } from '../../../shared/errors/domain-error'

describe('Expense', () => {
    const defaults = {
        groupId: 'group-1',
        payerId: 'user-1',
        memberId: 'member-1',
    }

    it('should create expense with valid shares', () => {
        const expense = Expense.create({
            groupId: defaults.groupId,
            payerId: defaults.payerId,
            description: 'Jantar',
            amount: new Money(100),
            shareInputs: [{ memberId: defaults.memberId, amount: new Money(100) }],
            splitMethod: SplitMethod.EQUAL,
        })
        expect(expense.id).toBeDefined()
        expect(expense.description).toBe('Jantar')
        expect(expense.splitMethod).toBe('EQUAL')
        expect(expense.shares).toHaveLength(1)
    })

    it('should throw DomainError for empty description', () => {
        expect(() =>
            Expense.create({
                groupId: defaults.groupId,
                payerId: defaults.payerId,
                description: '   ',
                amount: new Money(100),
                shareInputs: [{ memberId: defaults.memberId, amount: new Money(100) }],
                splitMethod: SplitMethod.EQUAL,
            }),
        ).toThrowError(DomainError)
    })

    it('should throw DomainError when no shares are provided', () => {
        expect(() =>
            Expense.create({
                groupId: defaults.groupId,
                payerId: defaults.payerId,
                description: 'Jantar',
                amount: new Money(100),
                shareInputs: [],
                splitMethod: SplitMethod.EQUAL,
            }),
        ).toThrowError(DomainError)
    })

    it('should throw DomainError when shares total does not match amount', () => {
        expect(() =>
            Expense.create({
                groupId: defaults.groupId,
                payerId: defaults.payerId,
                description: 'Jantar',
                amount: new Money(100),
                shareInputs: [{ memberId: defaults.memberId, amount: new Money(90) }],
                splitMethod: SplitMethod.EQUAL,
            }),
        ).toThrowError(DomainError)
    })

    it('should accept multiple shares summing to the total', () => {
        const expense = Expense.create({
            groupId: defaults.groupId,
            payerId: defaults.payerId,
            description: 'Churrasco',
            amount: new Money(60),
            shareInputs: [
                { memberId: 'member-1', amount: new Money(30) },
                { memberId: 'member-2', amount: new Money(30) },
            ],
            splitMethod: SplitMethod.EQUAL,
        })
        expect(expense.shares).toHaveLength(2)
    })

    it('should default occurredAt to now when not provided', () => {
        const before = new Date()
        const expense = Expense.create({
            groupId: defaults.groupId,
            payerId: defaults.payerId,
            description: 'Taxi',
            amount: new Money(20),
            shareInputs: [{ memberId: defaults.memberId, amount: new Money(20) }],
            splitMethod: SplitMethod.FIXED,
        })
        expect(expense.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('should create separate ExpenseShare objects with generated IDs', () => {
        const expense = Expense.create({
            groupId: defaults.groupId,
            payerId: defaults.payerId,
            description: 'Taxi',
            amount: new Money(40),
            shareInputs: [
                { memberId: 'member-1', amount: new Money(20) },
                { memberId: 'member-2', amount: new Money(20) },
            ],
            splitMethod: SplitMethod.EQUAL,
        })
        const [s1, s2] = expense.shares
        expect(s1.id).not.toBe(s2.id)
        expect(s1.expenseId).toBe(expense.id)
        expect(s2.expenseId).toBe(expense.id)
    })
})
