import { FastifyRequest, FastifyReply } from 'fastify'
import { groupIdParam } from '../schemas/group.schema'
import { makeGetGroupBalancesUseCase } from '../../factories/make-get-group-balances-use-case'

export async function getGroupBalances(request: FastifyRequest, reply: FastifyReply) {
    const { groupId } = groupIdParam.parse(request.params)

    const useCase = makeGetGroupBalancesUseCase()
    const { memberBalances, transfers } = await useCase.execute({
        groupId,
        requestingUserId: request.user.sub,
    })

    return reply.status(200).send({
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
    })
}
