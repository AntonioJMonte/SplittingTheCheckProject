import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { hash } from 'bcryptjs'
import { app } from '../../infra/http/app'
import { User } from '../../domain/entities/user'

const mockStore = vi.hoisted(() => ({ items: [] as any[] }))

vi.mock('../../infra/database/prisma/prismaUserRepository', async () => {
    const { makePrismaUserRepositoryMock } = await import('../helpers/make-prisma-user-repository-mock')
    return makePrismaUserRepositoryMock(mockStore)
})

describe('POST /refresh', () => {
  beforeEach(async () => {
    mockStore.items.splice(0)
    mockStore.items.push(
      User.create({ name: 'John Doe', email: 'john@example.com', passwordHash: await hash('password123', 1) }),
    )
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return 200 with new accessToken when refresh token is valid', async () => {
    const authResponse = await app.inject({
      method: 'POST',
      url: '/auth',
      payload: { email: 'john@example.com', password: 'password123' },
    })

    const refreshTokenCookie = authResponse.cookies.find(c => c.name === 'refreshToken')
    expect(refreshTokenCookie).toBeDefined()

    const response = await app.inject({
      method: 'POST',
      url: '/refresh',
      cookies: { refreshToken: refreshTokenCookie!.value },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.accessToken).toBeDefined()
  })

  it('should return 401 when no refresh token cookie is sent', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/refresh',
    })

    expect(response.statusCode).toBe(401)
  })

  it('should return 401 when refresh token is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/refresh',
      cookies: { refreshToken: 'invalid-token' },
    })

    expect(response.statusCode).toBe(401)
  })
})
