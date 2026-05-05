import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
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

describe('POST /register', () => {
  beforeEach(() => {
    mockStore.items.splice(0)
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return 201 on successful registration', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/register',
      payload: { name: 'John Doe', email: 'john@example.com', password: 'password123' },
    })

    expect(response.statusCode).toBe(201)
  })

  it('should return 409 when email is already registered', async () => {
    await app.inject({
      method: 'POST',
      url: '/register',
      payload: { name: 'John Doe', email: 'john@example.com', password: 'password123' },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/register',
      payload: { name: 'Jane Doe', email: 'john@example.com', password: 'password456' },
    })

    expect(response.statusCode).toBe(409)
  })

  it('should return 400 when body is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/register',
      payload: { email: 'not-an-email', password: '123' },
    })

    expect(response.statusCode).toBe(400)
  })
})