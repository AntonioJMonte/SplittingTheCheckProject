import { describe, it, expect } from 'vitest'
import { Member } from '../../../domain/entities/member'

describe('Member', () => {
    it('should create a regular member with MEMBER role', () => {
        const member = Member.create({ userId: 'user-1', groupId: 'group-1' })
        expect(member.id).toBeDefined()
        expect(member.userId).toBe('user-1')
        expect(member.groupId).toBe('group-1')
        expect(member.role).toBe('MEMBER')
        expect(member.isOwner()).toBe(false)
    })

    it('should create an owner member with OWNER role', () => {
        const owner = Member.createOwner({ userId: 'user-1', groupId: 'group-1' })
        expect(owner.role).toBe('OWNER')
        expect(owner.isOwner()).toBe(true)
    })

    it('should generate unique IDs for each member', () => {
        const a = Member.create({ userId: 'user-1', groupId: 'group-1' })
        const b = Member.create({ userId: 'user-1', groupId: 'group-1' })
        expect(a.id).not.toBe(b.id)
    })

    it('should set joinedAt within the current timestamp range', () => {
        const before = new Date()
        const member = Member.create({ userId: 'user-1', groupId: 'group-1' })
        const after = new Date()
        expect(member.joinedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
        expect(member.joinedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
})
