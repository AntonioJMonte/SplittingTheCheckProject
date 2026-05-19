import { FastifyRequest, FastifyReply } from 'fastify'
import { makeListGroupsUseCase } from '../../factories/make-list-groups-use-case'

export async function listGroups(request: FastifyRequest, reply: FastifyReply) {
    const useCase = makeListGroupsUseCase()
    const { groups } = await useCase.execute({ userId: request.user.sub })

    return reply.status(200).send({
        groups: groups.map(g => ({
            id: g.id,
            name: g.name,
            currency: g.currency,
            description: g.description,
        })),
    })
}
