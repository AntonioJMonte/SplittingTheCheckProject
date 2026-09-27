import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { app } from '../../infra/http/app'

const store = vi.hoisted(() => ({ items: [] as any[] }))
const stores = vi.hoisted(() => ({ groups: [] as any[], members: [] as any[] }))

vi.mock('../../infra/database/prisma/prismaUserRepository', async () => {
    const { makePrismaUserRepositoryMock } = await import('../helpers/make-prisma-user-repository-mock')
    return makePrismaUserRepositoryMock(store)
})

vi.mock('../../infra/database/prisma/prismaGroupRepository', () => ({
    PrismaGroupRepository: class {
        async create(group: any) {
            stores.groups.push(group)
            for (const member of group.members) {
                if (!stores.members.find((m: any) => m.id === member.id)) stores.members.push(member)
            }
        }
        async findById(id: string) { return stores.groups.find((g: any) => g.id === id) ?? null }
        async findByUserId(userId: string) {
            return stores.groups.filter((g: any) => g.members.some((m: any) => m.userId === userId))
        }
    },
}))

vi.mock('../../infra/database/prisma/prismaMemberRepository', () => ({
    PrismaMemberRepository: class {
        async addMemberToGroup(member: any) { stores.members.push(member) }
        async findById(id: string) { return stores.members.find((m: any) => m.id === id) ?? null }
        async findByUserAndGroup(userId: string, groupId: string) {
            return stores.members.find((m: any) => m.userId === userId && m.groupId === groupId && !m.deletedBy) ?? null
        }
        async findByGroupId(groupId: string) { return stores.members.filter((m: any) => m.groupId === groupId && !m.deletedBy) }
        async findRemovedByUserAndGroup(userId: string, groupId: string) {
            return stores.members.find((m: any) => m.userId === userId && m.groupId === groupId && m.deletedBy) ?? null
        }
        async removeMemberGroup(memberId: string, removedByUserId: string) {
            const item = stores.members.find((m: any) => m.id === memberId)
            if (item) item.deletedBy = removedByUserId
        }
        async reactivate(memberId: string) {
            const item = stores.members.find((m: any) => m.id === memberId)
            if (item) delete item.deletedBy
        }
    },
}))

function decodeToken(token: string) {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
}

async function registerAndAuth(name: string, email: string, phone?: string) {
    await app.inject({ method: 'POST', url: '/register', payload: { name, email, password: 'password123', phone } })
    const res = await app.inject({ method: 'POST', url: '/auth', payload: { email, password: 'password123' } })
    const { accessToken } = res.json()
    return { accessToken, userId: decodeToken(accessToken).sub }
}

async function makeGroup(token: string) {
    const res = await app.inject({
        method: 'POST',
        url: '/groups',
        headers: { Authorization: `Bearer ${token}` },
        payload: { name: 'Republica' },
    })
    return res.json().group.id
}

// Um unico afterAll no arquivo: fechar o app dentro de um describe derrubaria os seguintes.
afterAll(async () => {
    await app.close()
})

beforeEach(() => {
    store.items.splice(0)
    stores.groups.splice(0)
    stores.members.splice(0)
})

describe('Convite de membro por email ou telefone (D-71/D-77)', () => {

    it('adiciona pelo email, sem o dono precisar conhecer o UUID do convidado', async () => {
        const alice = await registerAndAuth('Alice', 'alice@example.com')
        const groupId = await makeGroup(alice.accessToken)
        const bob = await registerAndAuth('Bob', 'bob@example.com')

        const res = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/members`,
            headers: { Authorization: `Bearer ${alice.accessToken}` },
            payload: { email: 'bob@example.com' },
        })

        expect(res.statusCode).toBe(201)
        expect(res.json().member.userId).toBe(bob.userId)
        expect(res.json().member.role).toBe('MEMBER')
    })

    it('adiciona pelo telefone, aceitando o numero em formato humano', async () => {
        const alice = await registerAndAuth('Alice', 'alice@example.com')
        const groupId = await makeGroup(alice.accessToken)
        const bob = await registerAndAuth('Bob', 'bob@example.com', '+5511987654321')

        const res = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/members`,
            headers: { Authorization: `Bearer ${alice.accessToken}` },
            payload: { phone: '(11) 98765-4321' },
        })

        expect(res.statusCode).toBe(201)
        expect(res.json().member.userId).toBe(bob.userId)
    })

    it('responde 404 quando ninguem esta registrado com aquele email', async () => {
        const alice = await registerAndAuth('Alice', 'alice@example.com')
        const groupId = await makeGroup(alice.accessToken)

        const res = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/members`,
            headers: { Authorization: `Bearer ${alice.accessToken}` },
            payload: { email: 'ninguem@example.com' },
        })

        expect(res.statusCode).toBe(404)
    })

    it('responde 404 quando o convidado existe mas nao cadastrou telefone', async () => {
        const alice = await registerAndAuth('Alice', 'alice@example.com')
        const groupId = await makeGroup(alice.accessToken)
        await registerAndAuth('Bob', 'bob@example.com')

        const res = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/members`,
            headers: { Authorization: `Bearer ${alice.accessToken}` },
            payload: { phone: '11987654321' },
        })

        expect(res.statusCode).toBe(404)
    })

    it('recusa o body sem email e sem telefone', async () => {
        const alice = await registerAndAuth('Alice', 'alice@example.com')
        const groupId = await makeGroup(alice.accessToken)

        const res = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/members`,
            headers: { Authorization: `Bearer ${alice.accessToken}` },
            payload: {},
        })

        expect(res.statusCode).toBe(400)
    })

    it('nao aceita mais o userId que a rota exigia antes', async () => {
        const alice = await registerAndAuth('Alice', 'alice@example.com')
        const groupId = await makeGroup(alice.accessToken)
        const bob = await registerAndAuth('Bob', 'bob@example.com')

        const res = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/members`,
            headers: { Authorization: `Bearer ${alice.accessToken}` },
            payload: { userId: bob.userId },
        })

        expect(res.statusCode).toBe(400)
    })
})

describe('PATCH /users/phone (D-75)', () => {
    it('permite cadastrar o telefone depois do registro e entao ser convidado por ele', async () => {
        const alice = await registerAndAuth('Alice', 'alice@example.com')
        const groupId = await makeGroup(alice.accessToken)
        const bob = await registerAndAuth('Bob', 'bob@example.com')

        const patch = await app.inject({
            method: 'PATCH',
            url: '/users/phone',
            headers: { Authorization: `Bearer ${bob.accessToken}` },
            payload: { phone: '11987654321' },
        })
        expect(patch.statusCode).toBe(200)

        const convite = await app.inject({
            method: 'POST',
            url: `/groups/${groupId}/members`,
            headers: { Authorization: `Bearer ${alice.accessToken}` },
            payload: { phone: '+55 11 98765-4321' },
        })

        expect(convite.statusCode).toBe(201)
        expect(convite.json().member.userId).toBe(bob.userId)
    })

    it('recusa com 409 o telefone ja vinculado a outra conta', async () => {
        await registerAndAuth('Alice', 'alice@example.com', '11987654321')
        const bob = await registerAndAuth('Bob', 'bob@example.com')

        const res = await app.inject({
            method: 'PATCH',
            url: '/users/phone',
            headers: { Authorization: `Bearer ${bob.accessToken}` },
            payload: { phone: '(11) 98765-4321' },
        })

        expect(res.statusCode).toBe(409)
    })

    it('recusa com 400 um numero que nao e telefone', async () => {
        const bob = await registerAndAuth('Bob', 'bob@example.com')

        const res = await app.inject({
            method: 'PATCH',
            url: '/users/phone',
            headers: { Authorization: `Bearer ${bob.accessToken}` },
            payload: { phone: '123' },
        })

        expect(res.statusCode).toBe(400)
    })
})
