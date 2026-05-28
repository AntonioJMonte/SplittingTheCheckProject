import Decimal from 'decimal.js'
import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import type { groupIdParam } from '../schemas/group.schema'
import type { confirmSettlementBody } from '../schemas/settlement.schema'
import { makeConfirmSettlementUseCase } from '../../factories/make-confirm-settlement-use-case'
import { io } from '../../websocket/io'
import { emitSettlementConfirmed } from '../../websocket/handlers/settlement-events'

type ConfirmSettlementParams = z.infer<typeof groupIdParam>
type ConfirmSettlementBody = z.infer<typeof confirmSettlementBody>

export async function confirmSettlement(
    request: FastifyRequest<{ Params: ConfirmSettlementParams; Body: ConfirmSettlementBody }>,
    reply: FastifyReply,
) {
    const { groupId } = request.params
    const { fromMemberId, toMemberId, amount } = request.body

    const useCase = makeConfirmSettlementUseCase()
    const { settlement } = await useCase.execute({
        fromMemberId,
        toMemberId,
        amount: new Decimal(amount),
        requestUserId: request.user.sub,
    })

    const settlementPayload = {
        id: settlement.id,
        fromMemberId: settlement.fromMemberId,
        toMemberId: settlement.toMemberId,
        amount: settlement.amount.toFixed(2),
        status: settlement.status,
        pixCopyPaste: settlement.pixCopyPaste,
    }

    if (io) {
        emitSettlementConfirmed(io, groupId, settlementPayload).catch(() => {})
    }

    return reply.status(201).send({ settlement: settlementPayload })
}
