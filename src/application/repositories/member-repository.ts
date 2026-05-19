import { Member } from '../../domain/entities/member'

export interface MembersWithUser {
    id: string
    role: 'OWNER' | 'MEMBER'
    joinedAt: Date
    name: string
    email: string
    
}

export interface MemberRepository {
    addMemberToGroup(data: Member): Promise<void>
    findById(id: string): Promise<Member | null>
    findByUserAndGroup(userId: string, groupId: string): Promise<Member | null>
    findByGroupId(groupId: string): Promise<Member[]>
    removeMemberGroup(memberId: string): Promise<void>
    updateRole(memberId: string, role: 'OWNER' | 'MEMBER'): Promise<void>
    findByGroupIdWithUser(groupId: string): Promise<MembersWithUser[]>
}
