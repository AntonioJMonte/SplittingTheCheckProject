import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import { makeUpdateGroupUseCase } from '../../factories/make-update-group-use-case'
import type { groupIdParam, updateGroupBody } from '../schemas/group.schema'

type UpdateGroupParams = z.infer<typeof groupIdParam>
type UpdateGroupBody = z.infer<typeof updateGroupBody>

export async function updateGroup(
    request: FastifyRequest<{ Params: UpdateGroupParams; Body: UpdateGroupBody }>,
    reply: FastifyReply,
) {
    const { groupId } = request.params
    const { name, description, currency } = request.body

    const useCase = makeUpdateGroupUseCase()
    const { group } = await useCase.execute({
        groupId,
        requestingUserId: request.user.sub,
        name,
        description,
        currency,
    })

    return reply.status(200).send({
        group: {
            id: group.id,
            name: group.name,
            currency: group.currency,
            description: group.description,
        },
    })
}
