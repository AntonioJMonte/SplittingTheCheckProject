import Decimal from 'decimal.js'
import { FastifyRequest, FastifyReply } from 'fastify'
import { groupIdParam } from '../schemas/group.schema'
import { confirmSettlementBody } from '../schemas/settlement.schema'
import { makeConfirmSettlementUseCase } from '../../factories/make-confirm-settlement-use-case'

export async function confirmSettlement(request: FastifyRequest, reply: FastifyReply) {
    const { groupId: _groupId } = groupIdParam.parse(request.params)
    const { fromMemberId, toMemberId, amount } = confirmSettlementBody.parse(request.body)

    const useCase = makeConfirmSettlementUseCase()
    const { settlement } = await useCase.execute({
        fromMemberId,
        toMemberId,
        amount: new Decimal(amount),
        requestUserId: request.user.sub,
    })

    return reply.status(201).send({
        settlement: {
            id: settlement.id,
            fromMemberId: settlement.fromMemberId,
            toMemberId: settlement.toMemberId,
            amount: settlement.amount.toFixed(2),
            status: settlement.status,
            pixCopyPaste: settlement.pixCopyPaste,
        },
    })
}
