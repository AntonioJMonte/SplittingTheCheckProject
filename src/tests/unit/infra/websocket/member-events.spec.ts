import { describe, it, expect, beforeEach, vi } from 'vitest'
import { emitMemberAdded, emitMemberRemoved } from '../../../../infra/websocket/handlers/member-events'
import { makeFakeIo } from '../../../doubles/fake-socket-server'

const dedup = vi.hoisted(() => ({ guardDuplicate: vi.fn() }))

vi.mock('../../../../infra/websocket/event-dedup', () => ({
    guardDuplicate: dedup.guardDuplicate,
}))

const member = {
    id: 'member-1',
    userId: 'user-1',
    groupId: 'grupo-1',
    role: 'MEMBER',
    joinedAt: new Date('2026-09-25T12:00:00Z'),
}

describe('member events', () => {
    beforeEach(() => {
        dedup.guardDuplicate.mockReset()
        dedup.guardDuplicate.mockResolvedValue(false)
    })

    it('should emit member_added followed by balances_updated', async () => {
        const { io, emitted, events } = makeFakeIo()

        await emitMemberAdded(io, 'grupo-1', member)

        expect(events()).toEqual(['member_added', 'balances_updated'])
        expect(emitted[0].payload).toMatchObject({ groupId: 'grupo-1', member })
    })

    it('should emit member_removed followed by balances_updated', async () => {
        const { io, emitted, events } = makeFakeIo()

        await emitMemberRemoved(io, 'grupo-1', 'member-1')

        expect(events()).toEqual(['member_removed', 'balances_updated'])
        expect(emitted[0].payload).toMatchObject({ groupId: 'grupo-1', memberId: 'member-1' })
    })

    it('should emit nothing when the event is a duplicate', async () => {
        dedup.guardDuplicate.mockResolvedValue(true)
        const { io, emitted } = makeFakeIo()

        await emitMemberAdded(io, 'grupo-1', member)
        await emitMemberRemoved(io, 'grupo-1', 'member-1')

        expect(emitted).toHaveLength(0)
    })

    it('should send both events to the group room', async () => {
        const { io, emitted } = makeFakeIo()

        await emitMemberAdded(io, 'grupo-7', member)

        expect(emitted.every(e => e.room === 'grupo-7')).toBe(true)
    })
})
