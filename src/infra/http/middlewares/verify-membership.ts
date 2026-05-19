import { FastifyRequest, FastifyReply } from 'fastify'
import { Member } from '../../../domain/entities/member'
import { PrismaGroupRepository } from '../../database/prisma/prismaGroupRepository'
import { PrismaMemberRepository } from '../../database/prisma/prismaMemberRepository'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { NotGroupMemberError } from '../../../shared/errors/not-group-member-error'

declare module 'fastify' {
    interface FastifyRequest {
        membership: Member
    }
}

export async function verifyMembership(request: FastifyRequest, _reply: FastifyReply) {
    const { groupId } = request.params as { groupId: string }
    const userId = request.user.sub

    const groupRepository = new PrismaGroupRepository()
    const group = await groupRepository.findById(groupId)
    if (!group) {
        throw new GroupNotFoundError()
    }

    const memberRepository = new PrismaMemberRepository()
    const member = await memberRepository.findByUserAndGroup(userId, groupId)
    if (!member) {
        throw new NotGroupMemberError()
    }

    request.membership = member
}
