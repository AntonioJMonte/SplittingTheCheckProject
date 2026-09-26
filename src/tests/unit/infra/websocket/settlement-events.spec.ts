import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
    emitSettlementComputed,
    emitSettlementConfirmed,
} from '../../../../infra/websocket/handlers/settlement-events'
import { makeFakeIo } from '../../../doubles/fake-socket-server'

const dedup = vi.hoisted(() => ({ guardDuplicate: vi.fn() }))

vi.mock('../../../../infra/websocket/event-dedup', () => ({
    guardDuplicate: dedup.guardDuplicate,
}))

const suggestions = [
    { fromMemberId: 'm1', fromMemberName: 'Ana', toMemberId: 'm2', toMemberName: 'Bruno', amount: '33.34' },
]

const settlement = {
    id: 'acerto-1',
    fromMemberId: 'm1',
    toMemberId: 'm2',
    amount: '33.34',
    status: 'PENDING',
}

describe('settlement events', () => {
    beforeEach(() => {
        dedup.guardDuplicate.mockReset()
        dedup.guardDuplicate.mockResolvedValue(false)
    })

    it('should NOT emit balances_updated when settlements are only computed', async () => {
        const { io, emitted, events } = makeFakeIo()

        await emitSettlementComputed(io, 'grupo-1', suggestions)

        expect(events()).toEqual(['settlement_computed'])
        expect(emitted[0].payload).toMatchObject({ groupId: 'grupo-1', settlements: suggestions })
    })

    it('should emit settlement_confirmed followed by balances_updated', async () => {
        const { io, emitted, events } = makeFakeIo()

        await emitSettlementConfirmed(io, 'grupo-1', settlement)

        expect(events()).toEqual(['settlement_confirmed', 'balances_updated'])
        expect(emitted[0].payload).toMatchObject({ groupId: 'grupo-1', settlement })
    })

    it('should emit nothing when the event is a duplicate', async () => {
        dedup.guardDuplicate.mockResolvedValue(true)
        const { io, emitted } = makeFakeIo()

        await emitSettlementComputed(io, 'grupo-1', suggestions)
        await emitSettlementConfirmed(io, 'grupo-1', settlement)

        expect(emitted).toHaveLength(0)
    })

    it('should carry an empty suggestion list when there is nothing to settle', async () => {
        const { io, emitted } = makeFakeIo()

        await emitSettlementComputed(io, 'grupo-1', [])

        expect(emitted[0].payload).toMatchObject({ settlements: [] })
    })
})
