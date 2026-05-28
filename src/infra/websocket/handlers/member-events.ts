import { randomUUID } from 'node:crypto'
import type { Server } from 'socket.io'
import { guardDuplicate } from '../event-dedup'

interface MemberPayload {
    id: string
    userId: string
    groupId: string
    role: string
    joinedAt: Date
}

export async function emitMemberAdded(io: Server, groupId: string, member: MemberPayload): Promise<void> {
    const eventId = randomUUID()
    if (await guardDuplicate(groupId, eventId)) return
    io.to(groupId).emit('member_added', { eventId, groupId, member })
    io.to(groupId).emit('balances_updated', { groupId })
}

export async function emitMemberRemoved(io: Server, groupId: string, memberId: string): Promise<void> {
    const eventId = randomUUID()
    if (await guardDuplicate(groupId, eventId)) return
    io.to(groupId).emit('member_removed', { eventId, groupId, memberId })
    io.to(groupId).emit('balances_updated', { groupId })
}
