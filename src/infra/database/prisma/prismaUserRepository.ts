import { prisma } from './prismaClient'
import { User } from '../../../domain/entities/user'
import { Email } from '../../../domain/value-objects/email'
import { UserRepository } from '../../../application/repositories/users-repository'

export class PrismaUserRepository implements UserRepository {

    async create(data: User): Promise<void> {
        await prisma.user.create({
            data: {
                id: data.id,
                name: data.name,
                email: data.email.value,
                passwordHash: data.passwordHash,
                pixKey: data.pixKey,
            },
        })
    }

    async findByEmail(email: string): Promise<User | null> {
        const row = await prisma.user.findUnique({ where: { email } })
        if (!row) return null
        return new User(row.id, row.name, new Email(row.email), row.passwordHash, row.pixKey ?? undefined)
    }

    async findById(id: string): Promise<User | null> {
        const row = await prisma.user.findUnique({ where: { id } })
        if (!row) return null
        return new User(row.id, row.name, new Email(row.email), row.passwordHash, row.pixKey ?? undefined)
    }

    async updatePixKey(userId: string, pixKey: string | null): Promise<void> {
        await prisma.user.update({ where: { id: userId }, data: { pixKey } })
    }
}