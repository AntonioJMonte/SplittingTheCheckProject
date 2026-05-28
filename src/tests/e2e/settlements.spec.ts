import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { app } from '../../infra/http/app'
import { Member } from '../../domain/entities/member'
import { Settlement } from '../../domain/entities/settlement'
import { Money } from '../../domain/value-objects/money'

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
            const expenses = stores.expenses.filter((e: any) => e.groupId === params.groupId)
            return { expenses, total: expenses.length }
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

async function setupGroup() {
    const { accessToken, userId } = await registerAndAuth('Alice', 'alice@example.com')
    const createRes = await app.inject({
        method: 'POST',
        url: '/groups',
        headers: { Authorization: `Bearer ${accessToken}` },
        payload: { name: 'Grupo Test', currency: 'BRL' },
    })
    const groupId = createRes.json().group.id

    const membersRes = await app.inject({
        method: 'GET',
        url: `/groups/${groupId}/members`,
        headers: { Authorization: `Bearer ${accessToken}` },
    })
    const aliceMemberId = membersRes.json().members[0].id

    return { accessToken, userId, groupId, aliceMemberId }
}

async function setupGroupWithDebt() {
    const { accessToken: aliceToken, userId: aliceUserId } = await registerAndAuth('Alice', 'alice@example.com')
    const createRes = await app.inject({
        method: 'POST',
        url: '/groups',
        headers: { Authorization: `Bearer ${aliceToken}` },
        payload: { name: 'Grupo Test', currency: 'BRL' },
    })
    const groupId = createRes.json().group.id

    const membersRes = await app.inject({
        method: 'GET',
        url: `/groups/${groupId}/members`,
        headers: { Authorization: `Bearer ${aliceToken}` },
    })
    const aliceMemberId = membersRes.json().members[0].id

    const { accessToken: bobToken, userId: bobUserId } = await registerAndAuth('Bob', 'bob@example.com')
    const addRes = await app.inject({
        method: 'POST',
        url: `/groups/${groupId}/members`,
        headers: { Authorization: `Bearer ${aliceToken}` },
        payload: { userId: bobUserId },
    })
    const bobMemberId = addRes.json().member.id

    await app.inject({
        method: 'POST',
        url: `/groups/${groupId}/expenses`,
        headers: { Authorization: `Bearer ${aliceToken}` },
        payload: {
            description: 'Jantar',
            amount: 100,
            payerId: aliceUserId,
            splitMethod: 'EQUAL',
            shares: [{ memberId: bobMemberId }],
        },
    })

    return { aliceToken, aliceUserId, aliceMemberId, bobToken, bobUserId, bobMemberId, groupId }
}

describe('Settlements e2e', () => {
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

    it('GET /groups/:groupId/settlements/compute → 200 returns empty list when no expenses', async () => {
        const { accessToken, groupId } = await setupGroup()

        const res = await app.inject({
            method: 'GET',
            url: `/groups/${groupId}/settlements/compute`,
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        expect(res.statusCode).toBe(200)
        expect(res.json().settlements).toHaveLength(0)
    })

    it('POST /groups/:groupId/settlements → 201 creates a pending settlement', async () => {
        const { bobToken, bobMemberId, aliceMemberId, groupId } = await setupGroupWithDebt()

        const res = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/settlements`,
            headers: { Authorization: `Bearer ${bobToken}` },
            payload: { fromMemberId: bobMemberId, toMemberId: aliceMemberId, amount: 100 },
        })

        expect(res.statusCode).toBe(201)
        const body = res.json()
        expect(body.settlement.status).toBe('PENDING')
        expect(body.settlement.amount).toBe('100.00')
        expect(body.settlement.fromMemberId).toBe(bobMemberId)
        expect(body.settlement.toMemberId).toBe(aliceMemberId)
    })

    it('POST /groups/:groupId/settlements → 422 when amount exceeds debt', async () => {
        const { bobToken, bobMemberId, aliceMemberId, groupId } = await setupGroupWithDebt()

        const res = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/settlements`,
            headers: { Authorization: `Bearer ${bobToken}` },
            payload: { fromMemberId: bobMemberId, toMemberId: aliceMemberId, amount: 200 },
        })

        expect(res.statusCode).toBe(422)
    })

    it('GET /groups/:groupId/settlements/compute → 401 without authentication token', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/groups/00000000-0000-0000-0000-000000000000/settlements/compute',
        })

        expect(res.statusCode).toBe(401)
    })

    it('PATCH /settlements/:settlementId/acknowledge → 200 acknowledges a pending settlement', async () => {
        const { accessToken, groupId, aliceMemberId } = await setupGroup()

        const bobMember = Member.create({ userId: 'bob-fake-id', groupId })
        stores.members.push(bobMember)

        const settlement = Settlement.create({
            groupId,
            fromMemberId: bobMember.id,
            toMemberId: aliceMemberId,
            amount: new Money('50.00'),
        })
        stores.settlements.push(settlement)

        const res = await app.inject({
            method: 'PATCH',
            url: `/settlements/${settlement.id}/acknowledge`,
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        expect(res.statusCode).toBe(200)
        const body = res.json()
        expect(body.settlement.status).toBe('CONFIRMED')
        expect(body.settlement.amount).toBe('50.00')
        expect(body.settlement.confirmedAt).toBeDefined()
    })

    it('PATCH /settlements/:settlementId/acknowledge → 401 without authentication token', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: '/settlements/00000000-0000-0000-0000-000000000000/acknowledge',
        })

        expect(res.statusCode).toBe(401)
    })
})