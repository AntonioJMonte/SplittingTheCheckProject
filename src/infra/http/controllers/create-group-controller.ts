import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import { makeCreateGroupUseCase } from '../../factories/make-create-group-use-case'
import type { createGroupBody } from '../schemas/group.schema'

type CreateGroupBody = z.infer<typeof createGroupBody>

export async function createGroup(request: FastifyRequest<{ Body: CreateGroupBody }>, reply: FastifyReply) {
    const { name, description, currency } = request.body

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
