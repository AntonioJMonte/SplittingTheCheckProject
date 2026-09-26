import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { hash } from 'bcryptjs'
import { app } from '../../infra/http/app'
import { User } from '../../domain/entities/user'

const mockStore = vi.hoisted(() => ({ items: [] as any[] }))

vi.mock('../../infra/database/prisma/prismaUserRepository', async () => {
    const { makePrismaUserRepositoryMock } = await import('../helpers/make-prisma-user-repository-mock')
    return makePrismaUserRepositoryMock(mockStore)
})

describe('PATCH /users/pix-key', () => {
    beforeEach(async () => {
        mockStore.items.splice(0)
        mockStore.items.push(
            User.create({ name: 'Ana', email: 'ana@example.com', passwordHash: await hash('password123', 1) }),
        )
    })

    afterAll(async () => {
        await app.close()
    })

    async function auth() {
        const res = await app.inject({
            method: 'POST',
            url: '/auth',
            payload: { email: 'ana@example.com', password: 'password123' },
        })
        return res.json().accessToken as string
    }

    it('should set the pix key and return 200', async () => {
        const accessToken = await auth()

        const res = await app.inject({
            method: 'PATCH',
            url: '/users/pix-key',
            headers: { Authorization: `Bearer ${accessToken}` },
            payload: { pixKey: 'ana@example.com' },
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ message: 'Chave Pix atualizada com sucesso' })
        expect(mockStore.items[0].pixKey).toBe('ana@example.com')
    })

    it('should remove the pix key when null is sent', async () => {
        const accessToken = await auth()

        await app.inject({
            method: 'PATCH',
            url: '/users/pix-key',
            headers: { Authorization: `Bearer ${accessToken}` },
            payload: { pixKey: 'ana@example.com' },
        })

        const res = await app.inject({
            method: 'PATCH',
            url: '/users/pix-key',
            headers: { Authorization: `Bearer ${accessToken}` },
            payload: { pixKey: null },
        })

        expect(res.statusCode).toBe(200)
        expect(mockStore.items[0].pixKey).toBeUndefined()
    })

    it('should treat an omitted pixKey as removal', async () => {
        const accessToken = await auth()

        const res = await app.inject({
            method: 'PATCH',
            url: '/users/pix-key',
            headers: { Authorization: `Bearer ${accessToken}` },
            payload: {},
        })

        expect(res.statusCode).toBe(200)
        expect(mockStore.items[0].pixKey).toBeUndefined()
    })

    it('should reject an empty pix key with 400', async () => {
        const accessToken = await auth()

        const res = await app.inject({
            method: 'PATCH',
            url: '/users/pix-key',
            headers: { Authorization: `Bearer ${accessToken}` },
            payload: { pixKey: '' },
        })

        expect(res.statusCode).toBe(400)
    })

    it('should return 401 without an access token', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: '/users/pix-key',
            payload: { pixKey: 'ana@example.com' },
        })

        expect(res.statusCode).toBe(401)
    })
})
