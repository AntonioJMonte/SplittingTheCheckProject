import { describe, it, expect, beforeEach } from 'vitest'
import { UpdatePixKeyUseCase } from '../../../application/use-cases/users/update-pix-key-use-case'
import { InMemoryUserRepository } from '../../../infra/database/repositories/in-memory-user-repository'
import { User } from '../../../domain/entities/user'
import { AppError } from '../../../shared/errors/app-error'

describe('UpdatePixKeyUseCase', () => {
    let userRepository: InMemoryUserRepository
    let sut: UpdatePixKeyUseCase

    beforeEach(() => {
        userRepository = new InMemoryUserRepository()
        sut = new UpdatePixKeyUseCase(userRepository)
    })

    async function makeUser() {
        const user = User.create({ name: 'Alice', email: 'alice@example.com', passwordHash: 'hashed-pw' })
        await userRepository.create(user)
        return user
    }

    it('should set pix key for an existing user', async () => {
        const user = await makeUser()

        await sut.execute({ userId: user.id, pixKey: 'alice@pix.com' })

        const updated = await userRepository.findById(user.id)
        expect(updated?.pixKey).toBe('alice@pix.com')
    })

    it('should remove pix key when null is provided', async () => {
        const user = await makeUser()
        await sut.execute({ userId: user.id, pixKey: 'alice@pix.com' })

        await sut.execute({ userId: user.id, pixKey: null })

        const updated = await userRepository.findById(user.id)
        expect(updated?.pixKey).toBeUndefined()
    })

    it('should throw AppError with status 404 when user does not exist', async () => {
        const error = await sut.execute({ userId: 'nonexistent', pixKey: 'pix@test.com' }).catch(e => e)

        expect(error).toBeInstanceOf(AppError)
        expect(error.statusCode).toBe(404)
    })
})