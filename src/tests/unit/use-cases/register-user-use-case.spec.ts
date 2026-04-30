import { describe, it, expect, beforeEach } from 'vitest'
import { RegisterUserUseCase } from '../../../application/use-cases/auth/register-use-case'
import { InMemoryUserRepository } from '../../../infra/database/repositories/in-memory-user-repository'
import { UserAlreadyExistError } from '../../../shared/errors/user-already-exist-error'

describe('RegisterUserUseCase', () => {
  let userRepository: InMemoryUserRepository
  let sut: RegisterUserUseCase

  beforeEach(() => {
    userRepository = new InMemoryUserRepository()
    sut = new RegisterUserUseCase(userRepository)
  })

  it('should register a new user successfully', async () => {
    const { user } = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    })

    expect(user.id).toBeDefined()
    expect(user.name).toBe('John Doe')
    expect(user.email).toBe('john@example.com')
  })

  it('should hash the password before storing', async () => {
    const { user } = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    })

    expect(user.passwordHash).not.toBe('password123')
  })

  it('should throw UserAlreadyExistError when email is already taken', async () => {
    await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    })

    await expect(
      sut.execute({
        name: 'Jane Doe',
        email: 'john@example.com',
        password: 'password456',
      }),
    ).rejects.toBeInstanceOf(UserAlreadyExistError)
  })
})
