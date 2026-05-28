import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import type { groupIdParam } from '../schemas/group.schema'
import { makeComputeSettlementsUseCase } from '../../factories/make-compute-settlements-use-case'
import { io } from '../../websocket/io'
import { emitSettlementComputed } from '../../websocket/handlers/settlement-events'

type ComputeSettlementsParams = z.infer<typeof groupIdParam>

export async function computeSettlements(request: FastifyRequest<{ Params: ComputeSettlementsParams }>, reply: FastifyReply) {
    const { groupId } = request.params

    const useCase = makeComputeSettlementsUseCase()
    const { settlements } = await useCase.execute({
        groupId,
        requestUserId: request.user.sub,
    })

    const settlementsPayload = settlements.map(s => ({
        fromMemberId: s.fromMemberId,
        fromMemberName: s.fromMemberName,
        toMemberId: s.toMemberId,
        toMemberName: s.toMemberName,
        amount: s.amount.toFixed(2),
    }))

    if (io) {
        emitSettlementComputed(io, groupId, settlementsPayload).catch(() => {})
    }

    return reply.status(200).send({ settlements: settlementsPayload })
}
