import { GroupRepository } from '../../../application/repositories/group-repository'
import { Group } from '../../../domain/entities/group'

export class InMemoryGroupRepository implements GroupRepository {
    public items: Group[] = []

    async create(data: Group): Promise<void> {
        this.items.push(data)
    }

    async findById(id: string): Promise<Group | null> {
        return this.items.find(g => g.id === id) ?? null
    }

    async findByUserId(userId: string): Promise<Group[]> {
        return this.items.filter(g => g.members.some(m => m.userId === userId))
    }

    async update(data: Group): Promise<void> {
        const index = this.items.findIndex(g => g.id === data.id)
        if (index !== -1) this.items[index] = data
    }

    async delete(groupId: string): Promise<void> {
        const index = this.items.findIndex(g => g.id === groupId)
        if (index !== -1) this.items.splice(index, 1)
    }
}
