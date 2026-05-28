import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import { makeGetGroupBalancesUseCase } from '../../factories/make-get-group-balances-use-case'
import type { groupIdParam } from '../schemas/group.schema'
import { getGroupBalancesCache, setGroupBalancesCache } from '../../cache/group-balances-cache'

type GetGroupBalancesParams = z.infer<typeof groupIdParam>

export async function getGroupBalances(request: FastifyRequest<{ Params: GetGroupBalancesParams }>, reply: FastifyReply) {
    const { groupId } = request.params

    const cached = await getGroupBalancesCache(groupId)
    if (cached) {
        return reply.status(200).send(cached)
    }

    const useCase = makeGetGroupBalancesUseCase()
    const { memberBalances, transfers } = await useCase.execute({
        groupId,
        requestingUserId: request.user.sub,
    })

    const responseData = {
        memberBalances: memberBalances.map(mb => ({
            memberId: mb.memberId,
            userId: mb.userId,
            balance: mb.balance.toFixed(2),
        })),
        transfers: transfers.map(t => ({
            fromMemberId: t.fromMemberId,
            toMemberId: t.toMemberId,
            amount: t.amount.toString(),
        })),
    }

    await setGroupBalancesCache(groupId, responseData)

    return reply.status(200).send(responseData)
}
