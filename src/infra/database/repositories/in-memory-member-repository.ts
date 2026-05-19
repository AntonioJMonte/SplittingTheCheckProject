import { MemberRepository, MembersWithUser } from '../../../application/repositories/member-repository'
import { Member } from '../../../domain/entities/member'

export class InMemoryMemberRepository implements MemberRepository {
    public items: Member[] = []
    public userLookup: Map<string, { name: string; email: string }> = new Map()

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

    async updateRole(memberId: string, role: 'OWNER' | 'MEMBER'): Promise<void> {
        const index = this.items.findIndex(m => m.id === memberId)
        if (index !== -1) {
            const m = this.items[index]
            this.items[index] = new Member(m.id, m.userId, m.groupId, role, m.joinedAt)
        }
    }

    async findByGroupIdWithUser(groupId: string): Promise<MembersWithUser[]> {
        return this.items
            .filter(m => m.groupId === groupId)
            .map(m => {
                const userData = this.userLookup.get(m.userId) ?? { name: '', email: '' }
                return {
                    id: m.id,
                    role: m.role,
                    joinedAt: m.joinedAt,
                    name: userData.name,
                    email: userData.email,
                }
            })
    }
}