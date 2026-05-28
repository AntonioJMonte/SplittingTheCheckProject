import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import { makeListMemberUseCase } from '../../factories/make-list-member-use-case'
import type { groupIdParam } from '../schemas/group.schema'

type ListMembersParams = z.infer<typeof groupIdParam>

export async function listMembers(request: FastifyRequest<{ Params: ListMembersParams }>, reply: FastifyReply) {
    const { groupId } = request.params

    const useCase = makeListMemberUseCase()
    const { members } = await useCase.execute({
        requestingUserId: request.user.sub,
        groupId,
    })

    return reply.status(200).send({ members })
}
