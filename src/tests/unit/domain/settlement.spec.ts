import { describe, it, expect } from 'vitest'
import { Settlement } from '../../../domain/entities/settlement'
import { Money } from '../../../domain/value-objects/money'
import { DomainError } from '../../../shared/errors/domain-error'

describe('Settlement', () => {
    const props = {
        groupId: 'group-1',
        fromMemberId: 'member-1',
        toMemberId: 'member-2',
        amount: new Money(50),
    }

    it('should create a settlement with PENDING status', () => {
        const s = Settlement.create(props)
        expect(s.id).toBeDefined()
        expect(s.status).toBe('PENDING')
        expect(s.confirmedAt).toBeUndefined()
    })

    it('should confirm a pending settlement', () => {
        const s = Settlement.create(props)
        s.confirm()
        expect(s.status).toBe('CONFIRMED')
        expect(s.confirmedAt).toBeInstanceOf(Date)
    })

    it('should cancel a pending settlement', () => {
        const s = Settlement.create(props)
        s.cancel()
        expect(s.status).toBe('CANCELLED')
    })

    it('should throw DomainError when confirming an already confirmed settlement', () => {
        const s = Settlement.create(props)
        s.confirm()
        expect(() => s.confirm()).toThrowError(DomainError)
    })

    it('should throw DomainError when cancelling an already cancelled settlement', () => {
        const s = Settlement.create(props)
        s.cancel()
        expect(() => s.cancel()).toThrowError(DomainError)
    })

    it('should throw DomainError when cancelling a confirmed settlement', () => {
        const s = Settlement.create(props)
        s.confirm()
        expect(() => s.cancel()).toThrowError(DomainError)
    })

    it('should throw DomainError when confirming a cancelled settlement', () => {
        const s = Settlement.create(props)
        s.cancel()
        expect(() => s.confirm()).toThrowError(DomainError)
    })
})
