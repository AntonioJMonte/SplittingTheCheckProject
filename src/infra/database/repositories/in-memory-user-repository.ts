import { Prisma, User } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { UserRepository } from '../../../application/repositories/user-repository'

export class InMemoryUserRepository implements UserRepository {
  public items: User[] = []

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const user: User = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      pixKey: null,
      createdAt: new Date(),
    }
    this.items.push(user)
    return user
  }

  async findByEmail(email: string): Promise<User> {
    return this.items.find(u => u.email === email) as User
  }

  async findById(id: string): Promise<User> {
    return this.items.find(u => u.id === id) as User
  }
}