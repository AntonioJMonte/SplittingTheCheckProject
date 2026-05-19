import { FastifyRequest, FastifyReply } from 'fastify'
import { groupIdParam } from '../schemas/group.schema'
import { makeLeaveGroupUseCase } from '../../factories/make-leave-group-use-case'

export async function leaveGroup(request: FastifyRequest, reply: FastifyReply) {
    const { groupId } = groupIdParam.parse(request.params)

    const useCase = makeLeaveGroupUseCase()
    await useCase.execute({ groupId, requestingUserId: request.user.sub })

    return reply.status(204).send()
}
