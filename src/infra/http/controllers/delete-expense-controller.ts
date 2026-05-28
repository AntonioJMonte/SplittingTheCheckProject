import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import type { expenseIdParam } from '../schemas/expense.schema'
import { makeDeleteExpenseUseCase } from '../../factories/make-delete-expense-use-case'
import { io } from '../../websocket/io'
import { emitExpenseDeleted } from '../../websocket/handlers/expense-events'
import { invalidateGroupBalancesCache } from '../../cache/group-balances-cache'

type DeleteExpenseParams = z.infer<typeof expenseIdParam>

export async function deleteExpense(request: FastifyRequest<{ Params: DeleteExpenseParams }>, reply: FastifyReply) {
    const { expenseId } = request.params

    const useCase = makeDeleteExpenseUseCase()
    const { groupId } = await useCase.execute({ expenseId, requestUserId: request.user.sub })

    await invalidateGroupBalancesCache(groupId)

    if (io) {
        emitExpenseDeleted(io, groupId, expenseId).catch(() => {})
    }

    return reply.status(204).send()
}
