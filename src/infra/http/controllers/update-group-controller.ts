import { FastifyRequest, FastifyReply } from 'fastify'
import { groupIdParam, updateGroupBody } from '../schemas/group.schema'
import { makeUpdateGroupUseCase } from '../../factories/make-update-group-use-case'

export async function updateGroup(request: FastifyRequest, reply: FastifyReply) {
    const { groupId } = groupIdParam.parse(request.params)
    const { name, description, currency } = updateGroupBody.parse(request.body)

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
