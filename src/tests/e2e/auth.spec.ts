import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { hash } from 'bcryptjs'
import { app } from '../../infra/http/app'

const mockStore = vi.hoisted(() => ({ items: [] as any[] }))

vi.mock('../../infra/database/prisma/prismaUserRepository', () => ({
  PrismaUserRepository: class {
    async create(data: any) {
      const user = {
        id: Math.random().toString(36).slice(2),
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        pixKey: null,
        createdAt: new Date(),
      }
      mockStore.items.push(user)
      return user
    }
    async findByEmail(email: string) {
      return mockStore.items.find((u: any) => u.email === email) ?? null
    }
    async findById(id: string) {
      return mockStore.items.find((u: any) => u.id === id) ?? null
    }
  },
}))

describe('POST /auth', () => {
  beforeEach(async () => {
    mockStore.items.splice(0)
    mockStore.items.push({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: await hash('password123', 1),
      pixKey: null,
      createdAt: new Date(),
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return 200 with accessToken and set refreshToken cookie on valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth',
      payload: { email: 'john@example.com', password: 'password123' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.accessToken).toBeDefined()

    const refreshTokenCookie = response.cookies.find(c => c.name === 'refreshToken')
    expect(refreshTokenCookie).toBeDefined()
    expect(refreshTokenCookie?.httpOnly).toBe(true)
  })

  it('should return 401 when email is not registered', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth',
      payload: { email: 'notfound@example.com', password: 'password123' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('should return 401 when password is wrong', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth',
      payload: { email: 'john@example.com', password: 'wrong-password' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('should return 400 when body is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth',
      payload: { email: 'not-an-email' },
    })

    expect(response.statusCode).toBe(400)
  })
})