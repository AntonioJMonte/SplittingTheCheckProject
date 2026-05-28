import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { app } from '../../infra/http/app'

const stores = vi.hoisted(() => ({
    users: [] as any[],
    groups: [] as any[],
    members: [] as any[],
    expenses: [] as any[],
    settlements: [] as any[],
}))

vi.mock('../../infra/database/prisma/prismaUserRepository', () => ({
    PrismaUserRepository: class {
        async create(user: any) { stores.users.push(user) }
        async findByEmail(email: string) { return stores.users.find((u: any) => u.email.value === email) ?? null }
        async findById(id: string) { return stores.users.find((u: any) => u.id === id) ?? null }
        async updatePixKey(userId: string, pixKey: string | null) {
            const item = stores.users.find((u: any) => u.id === userId)
            if (item) (item as any).pixKey = pixKey ?? undefined
        }
    },
}))

vi.mock('../../infra/database/prisma/prismaGroupRepository', () => ({
    PrismaGroupRepository: class {
        async create(group: any) {
            stores.groups.push(group)
            for (const member of group.members) {
                if (!stores.members.find((m: any) => m.id === member.id)) {
                    stores.members.push(member)
                }
            }
        }
        async findById(id: string) { return stores.groups.find((g: any) => g.id === id) ?? null }
        async findByUserId(userId: string) {
            return stores.groups.filter((g: any) => g.members.some((m: any) => m.userId === userId))
        }
        async update(group: any) {
            const idx = stores.groups.findIndex((g: any) => g.id === group.id)
            if (idx !== -1) stores.groups[idx] = group
        }
        async delete(id: string) {
            const idx = stores.groups.findIndex((g: any) => g.id === id)
            if (idx !== -1) stores.groups.splice(idx, 1)
        }
    },
}))

vi.mock('../../infra/database/prisma/prismaMemberRepository', () => ({
    PrismaMemberRepository: class {
        async addMemberToGroup(member: any) { stores.members.push(member) }
        async findById(id: string) { return stores.members.find((m: any) => m.id === id) ?? null }
        async findByUserAndGroup(userId: string, groupId: string) {
            return stores.members.find((m: any) => m.userId === userId && m.groupId === groupId) ?? null
        }
        async findByGroupId(groupId: string) { return stores.members.filter((m: any) => m.groupId === groupId) }
        async findByGroupIdWithUser(groupId: string) {
            return stores.members
                .filter((m: any) => m.groupId === groupId)
                .map((m: any) => {
                    const user = stores.users.find((u: any) => u.id === m.userId)
                    return { id: m.id, role: m.role, joinedAt: m.joinedAt, name: user?.name ?? 'Unknown', email: user?.email?.value ?? '' }
                })
        }
        async removeMemberGroup(memberId: string) {
            const idx = stores.members.findIndex((m: any) => m.id === memberId)
            if (idx !== -1) stores.members.splice(idx, 1)
        }
        async updateRole() {}
    },
}))

vi.mock('../../infra/database/prisma/prismaExpenseRepository', () => ({
    PrismaExpenseRepository: class {
        async create(expense: any) { stores.expenses.push(expense) }
        async findById(id: string) { return stores.expenses.find((e: any) => e.id === id) ?? null }
        async findByGroupId(groupId: string) { return stores.expenses.filter((e: any) => e.groupId === groupId) }
        async findManyByGroup(params: any) {
            const page = params.page ?? 1
            const limit = params.limit ?? 20
            let results = stores.expenses.filter((e: any) => e.groupId === params.groupId)
            results = results.sort((a: any, b: any) => b.occurredAt.getTime() - a.occurredAt.getTime())
            const total = results.length
            const expenses = results.slice((page - 1) * limit, page * limit)
            return { expenses, total }
        }
        async update(expense: any) {
            const idx = stores.expenses.findIndex((e: any) => e.id === expense.id)
            if (idx !== -1) stores.expenses[idx] = expense
        }
        async delete(id: string) {
            const idx = stores.expenses.findIndex((e: any) => e.id === id)
            if (idx !== -1) stores.expenses.splice(idx, 1)
        }
    },
}))

vi.mock('../../infra/database/prisma/prismaSettlementRepository', () => ({
    PrismaSettlementRepository: class {
        async create(s: any) { stores.settlements.push(s) }
        async findById(id: string) { return stores.settlements.find((s: any) => s.id === id) ?? null }
        async findPendingBetweenMembers(from: string, to: string) {
            return stores.settlements.find((s: any) => s.fromMemberId === from && s.toMemberId === to && s.status === 'PENDING') ?? null
        }
        async findConfirmedByGroup(groupId: string) {
            return stores.settlements.filter((s: any) => s.groupId === groupId && s.status === 'CONFIRMED')
        }
        async findConfirmedByMemberAndGroup(memberId: string, groupId: string) {
            return stores.settlements.filter((s: any) => s.groupId === groupId && (s.fromMemberId === memberId || s.toMemberId === memberId) && s.status === 'CONFIRMED')
        }
        async updateStatus() {}
        async cancelPendingByGroupId() {}
    },
}))

function decodeToken(token: string): { sub: string } {
    const [, payload] = token.split('.')
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
}

async function registerAndAuth(name: string, email: string, password = 'password123') {
    await app.inject({ method: 'POST', url: '/register', payload: { name, email, password } })
    const authRes = await app.inject({ method: 'POST', url: '/auth', payload: { email, password } })
    const { accessToken } = authRes.json()
    const { sub: userId } = decodeToken(accessToken)
    return { accessToken, userId }
}

async function setupGroupWithMember() {
    const { accessToken, userId } = await registerAndAuth('Alice', 'alice@example.com')

    const createGroupRes = await app.inject({
        method: 'POST',
        url: '/groups',
        headers: { Authorization: `Bearer ${accessToken}` },
        payload: { name: 'Viagem', currency: 'BRL' },
    })
    const groupId = createGroupRes.json().group.id

    const membersRes = await app.inject({
        method: 'GET',
        url: `/groups/${groupId}/members`,
        headers: { Authorization: `Bearer ${accessToken}` },
    })
    const memberId = membersRes.json().members[0].id

    return { accessToken, userId, groupId, memberId }
}

describe('Expenses e2e', () => {
    beforeEach(() => {
        stores.users.splice(0)
        stores.groups.splice(0)
        stores.members.splice(0)
        stores.expenses.splice(0)
        stores.settlements.splice(0)
    })

    afterAll(async () => {
        await app.close()
    })

    it('POST /groups/:groupId/expenses → 201 creates expense with equal split', async () => {
        const { accessToken, userId, groupId, memberId } = await setupGroupWithMember()

        const res = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/expenses`,
            headers: { Authorization: `Bearer ${accessToken}` },
            payload: {
                description: 'Jantar',
                amount: 120.00,
                payerId: userId,
                splitMethod: 'EQUAL',
                shares: [{ memberId }],
            },
        })

        expect(res.statusCode).toBe(201)
        const body = res.json()
        expect(body.expense.description).toBe('Jantar')
        expect(body.expense.amount).toBe('120.00')
        expect(body.expense.shares).toHaveLength(1)
    })

    it('POST /groups/:groupId/expenses → 401 without authentication token', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/groups/00000000-0000-0000-0000-000000000000/expenses',
            payload: { description: 'Test', amount: 50, payerId: '00000000-0000-0000-0000-000000000000', splitMethod: 'EQUAL', shares: [{ memberId: '00000000-0000-0000-0000-000000000000' }] },
        })

        expect(res.statusCode).toBe(401)
    })

    it('GET /groups/:groupId/expenses → 200 returns list of expenses', async () => {
        const { accessToken, userId, groupId, memberId } = await setupGroupWithMember()

        await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/expenses`,
            headers: { Authorization: `Bearer ${accessToken}` },
            payload: { description: 'Almoço', amount: 80, payerId: userId, splitMethod: 'EQUAL', shares: [{ memberId }] },
        })

        const res = await app.inject({
            method: 'GET',
            url: `/groups/${groupId}/expenses`,
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        expect(res.statusCode).toBe(200)
        const body = res.json()
        expect(body.expenses).toHaveLength(1)
        expect(body.expenses[0].description).toBe('Almoço')
        expect(body.total).toBe(1)
    })

    it('PATCH /expenses/:expenseId → 200 updates expense description', async () => {
        const { accessToken, userId, groupId, memberId } = await setupGroupWithMember()

        const createRes = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/expenses`,
            headers: { Authorization: `Bearer ${accessToken}` },
            payload: { description: 'Descrição Original', amount: 50, payerId: userId, splitMethod: 'EQUAL', shares: [{ memberId }] },
        })
        const expenseId = createRes.json().expense.id

        const res = await app.inject({
            method: 'PATCH',
            url: `/expenses/${expenseId}`,
            headers: { Authorization: `Bearer ${accessToken}` },
            payload: { description: 'Descrição Atualizada' },
        })

        expect(res.statusCode).toBe(200)
        expect(res.json().expense.description).toBe('Descrição Atualizada')
    })

    it('DELETE /expenses/:expenseId → 204 deletes the expense', async () => {
        const { accessToken, userId, groupId, memberId } = await setupGroupWithMember()

        const createRes = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/expenses`,
            headers: { Authorization: `Bearer ${accessToken}` },
            payload: { description: 'Para deletar', amount: 30, payerId: userId, splitMethod: 'EQUAL', shares: [{ memberId }] },
        })
        const expenseId = createRes.json().expense.id

        const res = await app.inject({
            method: 'DELETE',
            url: `/expenses/${expenseId}`,
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        expect(res.statusCode).toBe(204)
        expect(stores.expenses).toHaveLength(0)
    })
})