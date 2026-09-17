import { FastifyRequest, FastifyReply } from 'fastify'
import type z from 'zod'
import type { expenseIdParam } from '../schemas/expense.schema'
import { makeCategorizeExpenseUseCase } from '../../factories/make-categorize-expense-use-case'
import { io } from '../../websocket/io'
import { emitExpenseCategorized } from '../../websocket/handlers/expense-events'

type CategorizeExpenseParams = z.infer<typeof expenseIdParam>

export async function categorizeExpense(
    request: FastifyRequest<{ Params: CategorizeExpenseParams }>,
    reply: FastifyReply,
) {
    const { expenseId } = request.params

    const useCase = makeCategorizeExpenseUseCase()
    const { expense, updated } = await useCase.execute({
        expenseId,
        requestUserId: request.user.sub,
    })

    if (updated && io && expense.category) {
        emitExpenseCategorized(io, expense.groupId, expense.id, expense.category).catch(() => {})
    }

    return reply.status(200).send({
        expense: {
            id: expense.id,
            groupId: expense.groupId,
            payerId: expense.payerId,
            description: expense.description,
            amount: expense.amount.toString(),
            splitMethod: expense.splitMethod,
            occurredAt: expense.occurredAt,
            category: expense.category,
            shares: expense.shares.map(s => ({
                id: s.id,
                memberId: s.memberId,
                amount: s.amount.toString(),
            })),
        },
    })
}
