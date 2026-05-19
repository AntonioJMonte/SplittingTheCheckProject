import { FastifyRequest, FastifyReply } from 'fastify'
import { groupIdParam } from '../schemas/group.schema'
import { memberIdParam } from '../schemas/member.schema'
import { makeRemoveMemberUseCase } from '../../factories/make-remove-member-use-case'

export async function removeMember(request: FastifyRequest, reply: FastifyReply) {
    const { groupId } = groupIdParam.parse(request.params)
    const { memberId } = memberIdParam.parse(request.params)

    const useCase = makeRemoveMemberUseCase()
    await useCase.execute({
        groupId,
        requestedByUserId: request.user.sub,
        targetMemberId: memberId,
    })

    return reply.status(204).send()
}
