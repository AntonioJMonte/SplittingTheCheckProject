import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { hash } from 'bcryptjs'
import { app } from '../../infra/http/app'
import { User } from '../../domain/entities/user'

const mockStore = vi.hoisted(() => ({ items: [] as any[] }))
const blacklistStore = vi.hoisted(() => ({ tokens: new Set<string>() }))

vi.mock('../../infra/database/prisma/prismaUserRepository', async () => {
    const { makePrismaUserRepositoryMock } = await import('../helpers/make-prisma-user-repository-mock')
    return makePrismaUserRepositoryMock(mockStore)
})

vi.mock('../../infra/cache/refresh-token-blacklist', async () => {
    const { makeRefreshTokenBlacklistMock } = await import('../helpers/make-refresh-token-blacklist-mock')
    return makeRefreshTokenBlacklistMock(blacklistStore)
})

describe('POST /logout', () => {
  beforeEach(async () => {
    mockStore.items.splice(0)
    blacklistStore.tokens.clear()
    mockStore.items.push(
      User.create({ name: 'John Doe', email: 'john@example.com', passwordHash: await hash('password123', 1) }),
    )
  })

  afterAll(async () => {
    await app.close()
  })

  async function login() {
    const response = await app.inject({
      method: 'POST',
      url: '/auth',
      payload: { email: 'john@example.com', password: 'password123' },
    })
    const cookie = response.cookies.find(c => c.name === 'refreshToken')
    return cookie!.value
  }

  it('should return 204 and clear the refreshToken cookie', async () => {
    const refreshToken = await login()

    const response = await app.inject({
      method: 'POST',
      url: '/logout',
      cookies: { refreshToken },
    })

    expect(response.statusCode).toBe(204)
    expect(response.body).toBe('')

    const cleared = response.cookies.find(c => c.name === 'refreshToken')
    expect(cleared).toBeDefined()
    expect(cleared?.value).toBe('')
  })

  it('should prevent a revoked token from renewing the access token', async () => {
    const refreshToken = await login()

    const beforeLogout = await app.inject({ method: 'POST', url: '/refresh', cookies: { refreshToken } })
    expect(beforeLogout.statusCode).toBe(200)

    await app.inject({ method: 'POST', url: '/logout', cookies: { refreshToken } })

    const afterLogout = await app.inject({ method: 'POST', url: '/refresh', cookies: { refreshToken } })
    expect(afterLogout.statusCode).toBe(401)
    expect(afterLogout.json().message).toBe('Refresh token inválido')
  })

  it('should be idempotent when called twice with the same token', async () => {
    const refreshToken = await login()

    const first = await app.inject({ method: 'POST', url: '/logout', cookies: { refreshToken } })
    const second = await app.inject({ method: 'POST', url: '/logout', cookies: { refreshToken } })

    expect(first.statusCode).toBe(204)
    expect(second.statusCode).toBe(204)
  })

  it('should return 204 when no refreshToken cookie is sent', async () => {
    const response = await app.inject({ method: 'POST', url: '/logout' })

    expect(response.statusCode).toBe(204)
    expect(blacklistStore.tokens.size).toBe(0)
  })

  it('should return 204 without revoking anything when the token is not a valid JWT', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/logout',
      cookies: { refreshToken: 'nao-e-um-jwt' },
    })

    expect(response.statusCode).toBe(204)
    expect(blacklistStore.tokens.size).toBe(0)
  })

  it('should not require an access token to log out', async () => {
    const refreshToken = await login()

    const response = await app.inject({
      method: 'POST',
      url: '/logout',
      cookies: { refreshToken },
      headers: { authorization: 'Bearer token-expirado-ou-invalido' },
    })

    expect(response.statusCode).toBe(204)
  })
})
