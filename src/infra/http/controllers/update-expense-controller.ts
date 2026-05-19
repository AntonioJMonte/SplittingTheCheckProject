import Decimal from 'decimal.js'
import { FastifyRequest, FastifyReply } from 'fastify'
import { expenseIdParam, updateExpenseBody } from '../schemas/expense.schema'
import { makeUpdateExpenseUseCase } from '../../factories/make-update-expense-use-case'

export async function updateExpense(request: FastifyRequest, reply: FastifyReply) {
    const { expenseId } = expenseIdParam.parse(request.params)
    const body = updateExpenseBody.parse(request.body)

    const shares = body.shares?.map(s => ({
        memberId: s.memberId,
        amount: s.amount !== undefined
            ? String(s.amount)
            : s.percentage !== undefined && body.amount !== undefined
                ? new Decimal(body.amount).times(s.percentage).dividedBy(100).toDecimalPlaces(2).toFixed(2)
                : '0',
    }))

    const useCase = makeUpdateExpenseUseCase()
    const { expense } = await useCase.execute({
        expenseId,
        requestUserId: request.user.sub,
        description: body.description,
        amount: body.amount !== undefined ? String(body.amount) : undefined,
        splitMethod: body.splitMethod,
        shares,
    })

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
