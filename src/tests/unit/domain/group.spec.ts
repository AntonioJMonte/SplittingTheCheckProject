import { describe, it, expect } from 'vitest'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { DomainError } from '../../../shared/errors/domain-error'

describe('Group', () => {
    const creatorId = 'user-1'

    it('should create a group with the creator as owner', () => {
        const group = Group.create({ name: 'Viagem', creatorUserId: creatorId })
        expect(group.id).toBeDefined()
        expect(group.name).toBe('Viagem')
        expect(group.members).toHaveLength(1)
        expect(group.getOwner().userId).toBe(creatorId)
    })

    it('should default currency to BRL', () => {
        const group = Group.create({ name: 'Churras', creatorUserId: creatorId })
        expect(group.currency).toBe('BRL')
    })

    it('should accept a custom currency', () => {
        const group = Group.create({ name: 'Trip', creatorUserId: creatorId, currency: 'USD' })
        expect(group.currency).toBe('USD')
    })

    it('should throw DomainError for empty name', () => {
        expect(() => Group.create({ name: '  ', creatorUserId: creatorId })).toThrowError(DomainError)
    })

    it('addMember should add a new member when requested by owner', () => {
        const group = Group.create({ name: 'Viagem', creatorUserId: creatorId })
        group.addMember(group.getOwner(), 'user-2')
        expect(group.members).toHaveLength(2)
    })

    it('addMember should throw DomainError when requested by a non-owner', () => {
        const group = Group.create({ name: 'Viagem', creatorUserId: creatorId })
        const nonOwner = Member.create({ userId: 'user-2', groupId: group.id })
        expect(() => group.addMember(nonOwner, 'user-3')).toThrowError(DomainError)
    })

    it('addMember should throw DomainError when user is already a member', () => {
        const group = Group.create({ name: 'Viagem', creatorUserId: creatorId })
        const owner = group.getOwner()
        group.addMember(owner, 'user-2')
        expect(() => group.addMember(owner, 'user-2')).toThrowError(DomainError)
    })

    it('removeMember should remove the target member', () => {
        const group = Group.create({ name: 'Viagem', creatorUserId: creatorId })
        const owner = group.getOwner()
        group.addMember(owner, 'user-2')
        group.removeMember(owner, 'user-2')
        expect(group.members).toHaveLength(1)
    })

    it('removeMember should throw DomainError when owner tries to remove themselves', () => {
        const group = Group.create({ name: 'Viagem', creatorUserId: creatorId })
        const owner = group.getOwner()
        expect(() => group.removeMember(owner, creatorId)).toThrowError(DomainError)
    })

    it('removeMember should throw DomainError when target is not in group', () => {
        const group = Group.create({ name: 'Viagem', creatorUserId: creatorId })
        const owner = group.getOwner()
        expect(() => group.removeMember(owner, 'nonexistent')).toThrowError(DomainError)
    })

    it('removeMember should throw DomainError when requested by a non-owner', () => {
        const group = Group.create({ name: 'Viagem', creatorUserId: creatorId })
        const owner = group.getOwner()
        group.addMember(owner, 'user-2')
        const nonOwner = Member.create({ userId: 'user-3', groupId: group.id })
        expect(() => group.removeMember(nonOwner, 'user-2')).toThrowError(DomainError)
    })
})
