import { describe, it, expect, beforeEach } from 'vitest'
import { hash } from 'bcryptjs'
import { AuthUserUseCase } from '../../../application/use-cases/auth/authenticate-user-use-case'
import { User } from '../../../domain/entities/user'
import { InMemoryUserRepository } from '../../../infra/database/repositories/in-memory-user-repository'
import { InvalidCredentialsError } from '../../../shared/errors/invalid-credentials-error'

describe('AuthUserUseCase', () => {
  let userRepository: InMemoryUserRepository
  let sut: AuthUserUseCase

  beforeEach(() => {
    userRepository = new InMemoryUserRepository()
    sut = new AuthUserUseCase(userRepository)
  })

  it('should authenticate with valid credentials', async () => {
    await userRepository.create(
      User.create({ name: 'John Doe', email: 'john@example.com', passwordHash: await hash('password123', 1) }),
    )

    const { user } = await sut.execute({
      email: 'john@example.com',
      password: 'password123',
    })

    expect(user).toBeDefined()
    expect(user.email.value).toBe('john@example.com')
  })

  it('should throw InvalidCredentialsError when email is not registered', async () => {
    await expect(
      sut.execute({ email: 'notfound@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('should throw InvalidCredentialsError when password is wrong', async () => {
    await userRepository.create(
      User.create({ name: 'John Doe', email: 'john@example.com', passwordHash: await hash('correct-password', 1) }),
    )

    await expect(
      sut.execute({ email: 'john@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })
})