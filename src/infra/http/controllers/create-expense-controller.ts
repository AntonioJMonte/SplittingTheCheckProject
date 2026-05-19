import Decimal from 'decimal.js'
import { FastifyRequest, FastifyReply } from 'fastify'
import { groupIdParam } from '../schemas/group.schema'
import { createExpenseBody } from '../schemas/expense.schema'
import { makeCreateExpenseUseCase } from '../../factories/make-create-expense-use-case'

function resolveShareAmounts(
    shares: Array<{ memberId: string; amount?: number; percentage?: number }>,
    total: number,
): Array<{ memberId: string; amount: string }> {
    return shares.map(s => {
        if (s.amount !== undefined) {
            return { memberId: s.memberId, amount: String(s.amount) }
        }
        if (s.percentage !== undefined) {
            return {
                memberId: s.memberId,
                amount: new Decimal(total).times(s.percentage).dividedBy(100).toDecimalPlaces(2).toFixed(2),
            }
        }
        return {
            memberId: s.memberId,
            amount: new Decimal(total).dividedBy(shares.length).toDecimalPlaces(2).toFixed(2),
        }
    })
}

export async function createExpense(request: FastifyRequest, reply: FastifyReply) {
    const { groupId } = groupIdParam.parse(request.params)
    const body = createExpenseBody.parse(request.body)

    const shareInputs = resolveShareAmounts(body.shares, body.amount)

    const useCase = makeCreateExpenseUseCase()
    const { expense } = await useCase.execute({
        groupId,
        payerUserId: body.payerId,
        description: body.description,
        amount: String(body.amount),
        shareInputs,
        splitMethod: body.splitMethod,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
        category: body.category,
    })

    return reply.status(201).send({
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
