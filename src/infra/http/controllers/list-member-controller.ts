import { FastifyRequest, FastifyReply } from 'fastify'
import { groupIdParam } from '../schemas/group.schema'
import { makeListMemberUseCase } from '../../factories/make-list-member-use-case'

export async function listMembers(request: FastifyRequest, reply: FastifyReply) {
    const { groupId } = groupIdParam.parse(request.params)

    const useCase = makeListMemberUseCase()
    const { members } = await useCase.execute({
        requestingUserId: request.user.sub,
        groupId,
    })

    return reply.status(200).send({ members })
}
