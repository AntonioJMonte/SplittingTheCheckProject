import { User } from '../../domain/entities/user'
import { UserRepository } from '../../application/repositories/users-repository'

export class InMemoryUserRepository implements UserRepository {
    public items: User[] = []

    async create(data: User): Promise<void> {
        this.items.push(data)
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.items.find(u => u.email.value === email) ?? null
    }

    async findByPhone(phone: string): Promise<User | null> {
        return this.items.find(u => u.phone?.value === phone) ?? null
    }

    async findById(id: string): Promise<User | null> {
        return this.items.find(u => u.id === id) ?? null
    }

    async updatePixKey(userId: string, pixKey: string | null): Promise<void> {
        const index = this.items.findIndex(u => u.id === userId)
        if (index !== -1) {
            const u = this.items[index]
            this.items[index] = new User(u.id, u.name, u.email, u.passwordHash, pixKey ?? undefined, u.phone)
        }
    }

    async updatePhone(userId: string, phone: string | null): Promise<void> {
        const index = this.items.findIndex(u => u.id === userId)
        if (index !== -1) {
            this.items[index] = this.items[index].withPhone(phone)
        }
    }
}
