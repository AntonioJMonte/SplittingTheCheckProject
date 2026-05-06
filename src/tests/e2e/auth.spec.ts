import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { hash } from 'bcryptjs'
import { app } from '../../infra/http/app'
import { User } from '../../domain/entities/user'

const mockStore = vi.hoisted(() => ({ items: [] as any[] }))

vi.mock('../../infra/database/prisma/prismaUserRepository', async () => {
    const { makePrismaUserRepositoryMock } = await import('../helpers/make-prisma-user-repository-mock')
    return makePrismaUserRepositoryMock(mockStore)
})

describe('POST /auth', () => {
  beforeEach(async () => {
    mockStore.items.splice(0)
    mockStore.items.push(
      User.create({ name: 'John Doe', email: 'john@example.com', passwordHash: await hash('password123', 1) }),
    )
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
