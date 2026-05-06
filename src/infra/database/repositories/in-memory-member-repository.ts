import { MemberRepository } from '../../../application/repositories/member-repository'
import { Member } from '../../../domain/entities/member'

export class InMemoryMemberRepository implements MemberRepository {
    public items: Member[] = []

    async addMemberToGroup(data: Member): Promise<void> {
        this.items.push(data)
    }

    async findById(id: string): Promise<Member | null> {
        return this.items.find(m => m.id === id) ?? null
    }

    async findByUserAndGroup(userId: string, groupId: string): Promise<Member | null> {
        return this.items.find(m => m.userId === userId && m.groupId === groupId) ?? null
    }

    async findByGroupId(groupId: string): Promise<Member[]> {
        return this.items.filter(m => m.groupId === groupId)
    }

    async removeMemberGroup(memberId: string): Promise<void> {
        const index = this.items.findIndex(m => m.id === memberId)
        if (index !== -1) this.items.splice(index, 1)
    }
}
