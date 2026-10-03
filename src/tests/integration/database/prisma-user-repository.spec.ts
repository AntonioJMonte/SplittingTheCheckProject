import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { prisma } from '../../../infra/database/prisma/prismaClient'
import { PrismaUserRepository } from '../../../infra/database/prisma/prismaUserRepository'
import { User } from '../../../domain/entities/user'
import { INTEGRATION_SCHEMA } from '../setup/integration-database-url'
import { resetDatabase } from '../setup/reset-database'

describe('PrismaUserRepository (Postgres real)', () => {
    const repository = new PrismaUserRepository()

    beforeAll(() => {
        expect(process.env.DATABASE_URL).toContain(`schema=${INTEGRATION_SCHEMA}`)
    })

    beforeEach(async () => {
        await resetDatabase()
    })

    afterAll(async () => {
        await prisma.$disconnect()
    })

    function makeUser(name: string, phone?: string) {
        return User.create({ name, email: `${name}@test.com`, passwordHash: 'hash', phone })
    }

    it('should round-trip a user with the phone stored in E.164', async () => {
        const user = makeUser('ana', '(11) 98765-4321')
        await repository.create(user)

        const found = await repository.findById(user.id)

        expect(found?.email.value).toBe('ana@test.com')
        expect(found?.phone?.value).toBe('+5511987654321')
        expect(found?.pixKey).toBeUndefined()
        const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
        expect(row.phone).toBe('+5511987654321')
    })

    it('should find by email and by the normalized phone, and return null for unknown values', async () => {
        const user = makeUser('bruno', '11987654321')
        await repository.create(user)

        expect((await repository.findByEmail('bruno@test.com'))?.id).toBe(user.id)
        expect((await repository.findByPhone('+5511987654321'))?.id).toBe(user.id)
        expect(await repository.findByEmail('ninguem@test.com')).toBeNull()
        expect(await repository.findByPhone('+5511900000000')).toBeNull()
        expect(await repository.findById('00000000-0000-0000-0000-000000000000')).toBeNull()
    })

    it('should let many users exist without a phone but reject a phone already taken (D-75)', async () => {
        await repository.create(makeUser('carla'))
        await repository.create(makeUser('davi'))
        await repository.create(makeUser('eva', '11987654321'))

        await expect(repository.create(makeUser('fabio', '(11) 98765-4321'))).rejects.toThrow()
        expect(await prisma.user.count()).toBe(3)
    })

    it('should set and clear the pix key', async () => {
        const user = makeUser('gabi')
        await repository.create(user)

        await repository.updatePixKey(user.id, 'gabi@pix.com')
        expect((await repository.findById(user.id))?.pixKey).toBe('gabi@pix.com')

        await repository.updatePixKey(user.id, null)
        expect((await repository.findById(user.id))?.pixKey).toBeUndefined()
    })

    it('should free a cleared phone for another account', async () => {
        const first = makeUser('hugo', '11987654321')
        const second = makeUser('iris')
        await repository.create(first)
        await repository.create(second)

        await repository.updatePhone(first.id, null)
        await repository.updatePhone(second.id, '+5511987654321')

        expect((await repository.findById(first.id))?.phone).toBeUndefined()
        expect((await repository.findByPhone('+5511987654321'))?.id).toBe(second.id)
    })
})
