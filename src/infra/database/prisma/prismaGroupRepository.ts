import { prisma } from './prismaClient'
import { GroupRepository } from '../../../application/repositories/group-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'

function toMember(row: { id: string; userId: string; groupId: string; role: string; joinedAt: Date }): Member {
    return new Member(row.id, row.userId, row.groupId, row.role as 'OWNER' | 'MEMBER', row.joinedAt)
}

function toGroup(row: {
    id: string
    name: string
    currency: string
    description: string | null
    members: Array<{ id: string; userId: string; groupId: string; role: string; joinedAt: Date }>
}): Group {
    return new Group(row.id, row.name, row.currency, row.members.map(toMember), row.description ?? undefined)
}

export class PrismaGroupRepository implements GroupRepository {

    async create(data: Group): Promise<void> {
        await prisma.$transaction(async tx => {
            await tx.group.create({
                data: {
                    id: data.id,
                    name: data.name,
                    currency: data.currency,
                    description: data.description,
                },
            })
            for (const member of data.members) {
                await tx.member.create({
                    data: {
                        id: member.id,
                        userId: member.userId,
                        groupId: member.groupId,
                        role: member.role,
                        joinedAt: member.joinedAt,
                    },
                })
            }
        })
    }

    async findById(id: string): Promise<Group | null> {
        const row = await prisma.group.findUnique({
            where: { id },
            include: { members: true },
        })
        if (!row) return null
        return toGroup(row)
    }

    async findByUserId(userId: string): Promise<Group[]> {
        const rows = await prisma.group.findMany({
            where: { members: { some: { userId } } },
            include: { members: true },
        })
        return rows.map(toGroup)
    }

    async update(data: Group): Promise<void> {
        await prisma.group.update({
            where: { id: data.id },
            data: {
                name: data.name,
                description: data.description,
                currency: data.currency,
            },
        })
    }

    async delete(groupId: string): Promise<void> {
        await prisma.group.delete({ where: { id: groupId } })
    }
}
