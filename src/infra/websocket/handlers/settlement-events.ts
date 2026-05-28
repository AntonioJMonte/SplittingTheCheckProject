import { randomUUID } from 'node:crypto'
import type { Server } from 'socket.io'
import { guardDuplicate } from '../event-dedup'

interface SettlementSuggestion {
    fromMemberId: string
    fromMemberName: string
    toMemberId: string
    toMemberName: string
    amount: string
}

interface SettlementPayload {
    id: string
    fromMemberId: string
    toMemberId: string
    amount: string
    status: string
}

export async function emitSettlementComputed(io: Server, groupId: string, settlements: SettlementSuggestion[]): Promise<void> {
    const eventId = randomUUID()
    if (await guardDuplicate(groupId, eventId)) return
    io.to(groupId).emit('settlement_computed', { eventId, groupId, settlements })
}

export async function emitSettlementConfirmed(io: Server, groupId: string, settlement: SettlementPayload): Promise<void> {
    const eventId = randomUUID()
    if (await guardDuplicate(groupId, eventId)) return
    io.to(groupId).emit('settlement_confirmed', { eventId, groupId, settlement })
    io.to(groupId).emit('balances_updated', { groupId })
}
