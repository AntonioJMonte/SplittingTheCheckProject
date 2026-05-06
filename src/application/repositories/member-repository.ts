import { Member } from '../../domain/entities/member'

export interface MemberRepository {
    addMemberToGroup(data: Member): Promise<void>
    findById(id: string): Promise<Member | null>
    findByUserAndGroup(userId: string, groupId: string): Promise<Member | null>
    findByGroupId(groupId: string): Promise<Member[]>
    removeMemberGroup(memberId: string): Promise<void>
}
