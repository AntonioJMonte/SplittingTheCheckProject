import { FastifyRequest, FastifyReply } from 'fastify'
import { createGroupBody } from '../schemas/group.schema'
import { makeCreateGroupUseCase } from '../../factories/make-create-group-use-case'

export async function createGroup(request: FastifyRequest, reply: FastifyReply) {
    const { name, description, currency } = createGroupBody.parse(request.body)

    const useCase = makeCreateGroupUseCase()
    const { group } = await useCase.execute({
        name,
        description: description ?? '',
        creatorUserId: request.user.sub,
        currency,
    })

    return reply.status(201).send({
        group: {
            id: group.id,
            name: group.name,
            currency: group.currency,
            description: group.description,
        },
    })
}
