import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
    emitExpenseCreated,
    emitExpenseUpdated,
    emitExpenseCategorized,
    emitExpenseDeleted,
} from '../../../../infra/websocket/handlers/expense-events'
import { makeFakeIo } from '../../../doubles/fake-socket-server'

const dedup = vi.hoisted(() => ({ guardDuplicate: vi.fn() }))

vi.mock('../../../../infra/websocket/event-dedup', () => ({
    guardDuplicate: dedup.guardDuplicate,
}))

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const expense = {
    id: 'despesa-1',
    groupId: 'grupo-1',
    payerId: 'user-1',
    description: 'Jantar',
    amount: '120.00',
    splitMethod: 'EQUAL',
    occurredAt: new Date('2026-09-25T12:00:00Z'),
    category: 'Alimentacao',
    shares: [{ id: 'parte-1', memberId: 'member-1', amount: '60.00' }],
}

describe('expense events', () => {
    beforeEach(() => {
        dedup.guardDuplicate.mockReset()
        dedup.guardDuplicate.mockResolvedValue(false)
    })

    it('should emit expense_created followed by balances_updated to the group room', async () => {
        const { io, emitted, events } = makeFakeIo()

        await emitExpenseCreated(io, 'grupo-1', expense)

        expect(events()).toEqual(['expense_created', 'balances_updated'])
        expect(emitted.every(e => e.room === 'grupo-1')).toBe(true)
        expect(emitted[0].payload).toMatchObject({ groupId: 'grupo-1', expense })
        expect(emitted[0].payload.eventId).toMatch(UUID_V4)
    })

    it('should emit expense_updated followed by balances_updated', async () => {
        const { io, events } = makeFakeIo()

        await emitExpenseUpdated(io, 'grupo-1', expense)

        expect(events()).toEqual(['expense_updated', 'balances_updated'])
    })

    it('should emit expense_deleted followed by balances_updated', async () => {
        const { io, emitted, events } = makeFakeIo()

        await emitExpenseDeleted(io, 'grupo-1', 'despesa-1')

        expect(events()).toEqual(['expense_deleted', 'balances_updated'])
        expect(emitted[0].payload).toMatchObject({ groupId: 'grupo-1', expenseId: 'despesa-1' })
    })

    it('should NOT emit balances_updated when only the category changed', async () => {
        const { io, emitted, events } = makeFakeIo()

        await emitExpenseCategorized(io, 'grupo-1', 'despesa-1', 'Transporte')

        expect(events()).toEqual(['expense_categorized'])
        expect(emitted[0].payload).toMatchObject({ expenseId: 'despesa-1', category: 'Transporte' })
    })

    it('should emit nothing when the event is a duplicate', async () => {
        dedup.guardDuplicate.mockResolvedValue(true)
        const { io, emitted } = makeFakeIo()

        await emitExpenseCreated(io, 'grupo-1', expense)
        await emitExpenseUpdated(io, 'grupo-1', expense)
        await emitExpenseDeleted(io, 'grupo-1', 'despesa-1')
        await emitExpenseCategorized(io, 'grupo-1', 'despesa-1', 'Transporte')

        expect(emitted).toHaveLength(0)
    })

    it('should ask the dedup guard for the group being notified', async () => {
        const { io } = makeFakeIo()

        await emitExpenseCreated(io, 'grupo-9', expense)

        expect(dedup.guardDuplicate).toHaveBeenCalledWith('grupo-9', expect.stringMatching(UUID_V4))
    })

    it('should generate a distinct eventId per emission', async () => {
        const { io, emitted } = makeFakeIo()

        await emitExpenseCreated(io, 'grupo-1', expense)
        await emitExpenseCreated(io, 'grupo-1', expense)

        expect(emitted[0].payload.eventId).not.toBe(emitted[2].payload.eventId)
    })
})
