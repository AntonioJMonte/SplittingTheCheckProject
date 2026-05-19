import { FastifyRequest, FastifyReply } from 'fastify'
import { settlementIdParam } from '../schemas/settlement.schema'
import { makeAcknowledgeSettlementUseCase } from '../../factories/make-acknowledge-settlement-use-case'

export async function acknowledgeSettlement(request: FastifyRequest, reply: FastifyReply) {
    const { settlementId } = settlementIdParam.parse(request.params)

    const useCase = makeAcknowledgeSettlementUseCase()
    const { settlement } = await useCase.execute({
        settlementId,
        requestUserId: request.user.sub,
    })

    return reply.status(200).send({
        settlement: {
            id: settlement.id,
            fromMemberId: settlement.fromMemberId,
            toMemberId: settlement.toMemberId,
            amount: settlement.amount.toFixed(2),
            status: settlement.status,
            confirmedAt: settlement.confirmedAt,
        },
    })
}
