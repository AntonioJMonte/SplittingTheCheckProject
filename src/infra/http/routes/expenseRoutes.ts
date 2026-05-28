import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from '@fastify/type-provider-zod'
import { verifyJwt } from '../middlewares/verify-jwt'
import { updateExpense } from '../controllers/update-expense-controller'
import { deleteExpense } from '../controllers/delete-expense-controller'
import { updateExpenseRouteSchema, deleteExpenseRouteSchema } from '../schemas/expense.schema'

export async function expenseRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>()

    app.addHook('preHandler', verifyJwt)

    app.patch('/expenses/:expenseId', { schema: updateExpenseRouteSchema }, updateExpense)
    app.delete('/expenses/:expenseId', { schema: deleteExpenseRouteSchema }, deleteExpense)
}
