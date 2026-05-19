import { FastifyRequest, FastifyReply } from 'fastify'
import { expenseIdParam } from '../schemas/expense.schema'
import { makeDeleteExpenseUseCase } from '../../factories/make-delete-expense-use-case'

export async function deleteExpense(request: FastifyRequest, reply: FastifyReply) {
    const { expenseId } = expenseIdParam.parse(request.params)

    const useCase = makeDeleteExpenseUseCase()
    await useCase.execute({ expenseId, requestUserId: request.user.sub })

    return reply.status(204).send()
}
