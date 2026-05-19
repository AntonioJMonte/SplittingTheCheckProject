import { FastifyRequest, FastifyReply } from 'fastify'
import { groupIdParam } from '../schemas/group.schema'
import { makeComputeSettlementsUseCase } from '../../factories/make-compute-settlements-use-case'

export async function computeSettlements(request: FastifyRequest, reply: FastifyReply) {
    const { groupId } = groupIdParam.parse(request.params)

    const useCase = makeComputeSettlementsUseCase()
    const { settlements } = await useCase.execute({
        groupId,
        requestUserId: request.user.sub,
    })

    return reply.status(200).send({
        settlements: settlements.map(s => ({
            fromMemberId: s.fromMemberId,
            fromMemberName: s.fromMemberName,
            toMemberId: s.toMemberId,
            toMemberName: s.toMemberName,
            amount: s.amount.toFixed(2),
        })),
    })
}
