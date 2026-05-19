import { describe, it, expect, beforeEach } from 'vitest'
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/refresh-token-use-case'
import { InMemoryUserRepository } from '../../../infra/database/repositories/in-memory-user-repository'
import { User } from '../../../domain/entities/user'
import { InvalidCredentialsError } from '../../../shared/errors/invalid-credentials-error'

describe('RefreshTokenUseCase', () => {
  let userRepository: InMemoryUserRepository
  let sut: RefreshTokenUseCase

  beforeEach(() => {
    userRepository = new InMemoryUserRepository()
    sut = new RefreshTokenUseCase(userRepository)
  })

  it('should return the user when userId is valid', async () => {
    const user = User.create({ name: 'Alice', email: 'alice@example.com', passwordHash: 'hash' })
    await userRepository.create(user)

    const { user: result } = await sut.execute({ userId: user.id })

    expect(result.id).toBe(user.id)
    expect(result.email.value).toBe('alice@example.com')
  })

  it('should throw InvalidCredentialsError when userId does not exist', async () => {
    await expect(
      sut.execute({ userId: 'nonexistent-id' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })
})
