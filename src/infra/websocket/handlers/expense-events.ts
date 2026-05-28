import { randomUUID } from 'node:crypto'
import type { Server } from 'socket.io'
import { guardDuplicate } from '../event-dedup'

interface ExpensePayload {
    id: string
    groupId: string
    payerId: string
    description: string
    amount: string
    splitMethod: string
    occurredAt: Date
    category?: string | null
    shares: Array<{ id: string; memberId: string; amount: string }>
}

export async function emitExpenseCreated(io: Server, groupId: string, expense: ExpensePayload): Promise<void> {
    const eventId = randomUUID()
    if (await guardDuplicate(groupId, eventId)) return
    io.to(groupId).emit('expense_created', { eventId, groupId, expense })
    io.to(groupId).emit('balances_updated', { groupId })
}

export async function emitExpenseUpdated(io: Server, groupId: string, expense: ExpensePayload): Promise<void> {
    const eventId = randomUUID()
    if (await guardDuplicate(groupId, eventId)) return
    io.to(groupId).emit('expense_updated', { eventId, groupId, expense })
    io.to(groupId).emit('balances_updated', { groupId })
}

export async function emitExpenseDeleted(io: Server, groupId: string, expenseId: string): Promise<void> {
    const eventId = randomUUID()
    if (await guardDuplicate(groupId, eventId)) return
    io.to(groupId).emit('expense_deleted', { eventId, groupId, expenseId })
    io.to(groupId).emit('balances_updated', { groupId })
}
