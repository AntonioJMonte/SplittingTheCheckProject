import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import { makeDeleteGroupUseCase } from '../../factories/make-delete-group-use-case'
import type { groupIdParam } from '../schemas/group.schema'

type DeleteGroupParams = z.infer<typeof groupIdParam>

export async function deleteGroup(request: FastifyRequest<{ Params: DeleteGroupParams }>, reply: FastifyReply) {
    const { groupId } = request.params

    const useCase = makeDeleteGroupUseCase()
    await useCase.execute({ groupId, requestingUserId: request.user.sub })

    return reply.status(204).send()
}
