import { prisma } from './prismaClient'
import { User } from '../../../domain/entities/user'
import { Email } from '../../../domain/value-objects/email'
import { Phone } from '../../../domain/value-objects/phone'
import { UserRepository } from '../../../application/repositories/users-repository'

type UserRow = {
    id: string
    name: string
    email: string
    passwordHash: string
    pixKey: string | null
    phone: string | null
}

function toUser(row: UserRow): User {
    return new User(
        row.id,
        row.name,
        new Email(row.email),
        row.passwordHash,
        row.pixKey ?? undefined,
        row.phone ? new Phone(row.phone) : undefined,
    )
}

export class PrismaUserRepository implements UserRepository {

    async create(data: User): Promise<void> {
        await prisma.user.create({
            data: {
                id: data.id,
                name: data.name,
                email: data.email.value,
                passwordHash: data.passwordHash,
                pixKey: data.pixKey,
                phone: data.phone?.value ?? null,
            },
        })
    }

    async findByEmail(email: string): Promise<User | null> {
        const row = await prisma.user.findUnique({ where: { email } })
        return row ? toUser(row) : null
    }

    async findByPhone(phone: string): Promise<User | null> {
        const row = await prisma.user.findUnique({ where: { phone } })
        return row ? toUser(row) : null
    }

    async findById(id: string): Promise<User | null> {
        const row = await prisma.user.findUnique({ where: { id } })
        return row ? toUser(row) : null
    }

    async updatePixKey(userId: string, pixKey: string | null): Promise<void> {
        await prisma.user.update({ where: { id: userId }, data: { pixKey } })
    }

    async updatePhone(userId: string, phone: string | null): Promise<void> {
        await prisma.user.update({ where: { id: userId }, data: { phone } })
    }
}
