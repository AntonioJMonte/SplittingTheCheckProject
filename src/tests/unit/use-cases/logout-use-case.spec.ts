import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LogoutUseCase } from '../../../application/use-cases/auth/logout-use-case'
import { FakeRefreshTokenRevoker } from '../../helpers/fake-refresh-token-revoker'

describe('LogoutUseCase', () => {
  let revoker: FakeRefreshTokenRevoker
  let sut: LogoutUseCase

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-24T12:00:00Z'))
    revoker = new FakeRefreshTokenRevoker()
    sut = new LogoutUseCase(revoker)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function expiresInSeconds(seconds: number) {
    return Math.floor(Date.now() / 1000) + seconds
  }

  it('should revoke the token with the remaining lifetime as TTL', async () => {
    const { revoked } = await sut.execute({ token: 'token-abc', expiresAt: expiresInSeconds(3600) })

    expect(revoked).toBe(true)
    expect(revoker.revoked.get('token-abc')).toBe(3600)
  })

  it('should not revoke a token that already expired', async () => {
    const { revoked } = await sut.execute({ token: 'token-velho', expiresAt: expiresInSeconds(-1) })

    expect(revoked).toBe(false)
    expect(revoker.revoked.size).toBe(0)
  })

  it('should not revoke a token expiring exactly now', async () => {
    const { revoked } = await sut.execute({ token: 'token-limite', expiresAt: expiresInSeconds(0) })

    expect(revoked).toBe(false)
    expect(revoker.revoked.size).toBe(0)
  })

  it('should keep the last revocation when the same token is revoked twice', async () => {
    await sut.execute({ token: 'token-abc', expiresAt: expiresInSeconds(3600) })
    await sut.execute({ token: 'token-abc', expiresAt: expiresInSeconds(1800) })

    expect(revoker.revoked.size).toBe(1)
    expect(revoker.revoked.get('token-abc')).toBe(1800)
  })

  it('should propagate a revoker failure instead of reporting success', async () => {
    const failing = new FakeRefreshTokenRevoker()
    failing.revoke = async () => {
      throw new Error('Redis fora do ar')
    }

    await expect(
      new LogoutUseCase(failing).execute({ token: 'token-abc', expiresAt: expiresInSeconds(3600) }),
    ).rejects.toThrow('Redis fora do ar')
  })
})
