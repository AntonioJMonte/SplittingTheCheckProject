import { FastifyRequest, FastifyReply } from 'fastify'
import { groupIdParam } from '../schemas/group.schema'
import { makeDeleteGroupUseCase } from '../../factories/make-delete-group-use-case'

export async function deleteGroup(request: FastifyRequest, reply: FastifyReply) {
    const { groupId } = groupIdParam.parse(request.params)

    const useCase = makeDeleteGroupUseCase()
    await useCase.execute({ groupId, requestingUserId: request.user.sub })

    return reply.status(204).send()
}
