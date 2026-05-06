import { MemberRepository } from '../../../application/repositories/member-repository'
import { Member } from '../../../domain/entities/member'
import { prisma } from './prismaClient'

function toMember(row: { id: string; userId: string; groupId: string; role: string; joinedAt: Date }): Member {
    return new Member(row.id, row.userId, row.groupId, row.role as 'OWNER' | 'MEMBER', row.joinedAt)
}

export class PrismaMemberRepository implements MemberRepository {

    async addMemberToGroup(data: Member): Promise<void> {
        await prisma.member.create({
            data: {
                id: data.id,
                groupId: data.groupId,
                userId: data.userId,
                role: data.role,
                joinedAt: data.joinedAt,
            },
        })
    }

    async findById(id: string): Promise<Member | null> {
        const row = await prisma.member.findUnique({ where: { id } })
        if (!row) return null
        return toMember(row)
    }

    async findByUserAndGroup(userId: string, groupId: string): Promise<Member | null> {
        const row = await prisma.member.findUnique({
            where: { userId_groupId: { userId, groupId } },
        })
        if (!row) return null
        return toMember(row)
    }

    async findByGroupId(groupId: string): Promise<Member[]> {
        const rows = await prisma.member.findMany({ where: { groupId } })
        return rows.map(toMember)
    }

    async removeMemberGroup(memberId: string): Promise<void> {
        await prisma.member.delete({ where: { id: memberId } })
    }
}
