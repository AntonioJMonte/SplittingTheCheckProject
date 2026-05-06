import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { app } from '../../infra/http/app'

const mockStore = vi.hoisted(() => ({ items: [] as any[] }))

vi.mock('../../infra/database/prisma/prismaUserRepository', async () => {
    const { makePrismaUserRepositoryMock } = await import('../helpers/make-prisma-user-repository-mock')
    return makePrismaUserRepositoryMock(mockStore)
})

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
