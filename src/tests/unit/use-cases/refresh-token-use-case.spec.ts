import { describe, it, expect, beforeEach } from 'vitest'
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/refresh-token-use-case'
import { InMemoryUserRepository } from '../../doubles/in-memory-user-repository'
import { User } from '../../../domain/entities/user'
import { InvalidCredentialsError } from '../../../shared/errors/invalid-credentials-error'
import { FakeRefreshTokenRevoker } from '../../helpers/fake-refresh-token-revoker'

describe('RefreshTokenUseCase', () => {
  let userRepository: InMemoryUserRepository
  let revoker: FakeRefreshTokenRevoker
  let sut: RefreshTokenUseCase

  beforeEach(() => {
    userRepository = new InMemoryUserRepository()
    revoker = new FakeRefreshTokenRevoker()
    sut = new RefreshTokenUseCase(userRepository, revoker)
  })

  it('should return the user when userId is valid', async () => {
    const user = User.create({ name: 'Alice', email: 'alice@example.com', passwordHash: 'hash' })
    await userRepository.create(user)

    const { user: result } = await sut.execute({ userId: user.id, token: 'token-valido' })

    expect(result.id).toBe(user.id)
    expect(result.email.value).toBe('alice@example.com')
  })

  it('should throw InvalidCredentialsError when userId does not exist', async () => {
    await expect(
      sut.execute({ userId: 'nonexistent-id', token: 'token-valido' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('should throw InvalidCredentialsError when the token was revoked', async () => {
    const user = User.create({ name: 'Alice', email: 'alice@example.com', passwordHash: 'hash' })
    await userRepository.create(user)
    await revoker.revoke('token-revogado', 3600)

    await expect(
      sut.execute({ userId: user.id, token: 'token-revogado' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('should reject the renewal when the blacklist cannot be reached (fail-closed)', async () => {
    const user = User.create({ name: 'Alice', email: 'alice@example.com', passwordHash: 'hash' })
    await userRepository.create(user)
    revoker.failClosed = true

    await expect(
      sut.execute({ userId: user.id, token: 'token-valido' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })
})
