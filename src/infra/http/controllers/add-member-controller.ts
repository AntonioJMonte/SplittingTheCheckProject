import { FastifyRequest, FastifyReply } from 'fastify'
import { groupIdParam } from '../schemas/group.schema'
import { addMemberBody } from '../schemas/member.schema'
import { makeAddMemberUseCase } from '../../factories/make-add-member-use-case'

export async function addMember(request: FastifyRequest, reply: FastifyReply) {
    const { groupId } = groupIdParam.parse(request.params)
    const { userId } = addMemberBody.parse(request.body)

    const useCase = makeAddMemberUseCase()
    const { newMember } = await useCase.execute({
        groupId,
        requestedByUserId: request.user.sub,
        newUserId: userId,
    })

    return reply.status(201).send({
        member: {
            id: newMember.id,
            userId: newMember.userId,
            groupId: newMember.groupId,
            role: newMember.role,
            joinedAt: newMember.joinedAt,
        },
    })
}
