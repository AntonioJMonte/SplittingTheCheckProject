import { User } from '../../../domain/entities/user'
import { UserRepository } from '../../../application/repositories/users-repository'

export class InMemoryUserRepository implements UserRepository {
    public items: User[] = []

    async create(data: User): Promise<void> {
        this.items.push(data)
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.items.find(u => u.email.value === email) ?? null
    }

    async findById(id: string): Promise<User | null> {
        return this.items.find(u => u.id === id) ?? null
    }
}
